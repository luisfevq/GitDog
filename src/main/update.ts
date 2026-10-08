import type { UpdateCheck, UpdateInfo } from '../shared/types'
import { LAST_INTEL_VERSION, RELEASES_REPO } from '../shared/app-info'

const parse = (version: string): number[] =>
  version
    .replace(/^v/i, '')
    .split('-')[0]
    .split('.')
    .map((n) => Number(n) || 0)

/** True when `candidate` is a higher version than `current` (1.2.0 > 1.1.9). */
export function isNewer(candidate: string, current: string): boolean {
  const a = parse(candidate)
  const b = parse(current)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff > 0
  }
  return false
}

interface Release {
  tag: string
  url: string
  name: string
}

/** The GitHub API. It answers 403 once an IP address makes 60 requests an hour, for example an office network. */
async function fromApi(): Promise<Release | null> {
  const res = await fetch(`https://api.github.com/repos/${RELEASES_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'GitDog' }
  })
  if (!res.ok) return null
  const r = (await res.json()) as { tag_name: string; html_url: string; name: string | null }
  return { tag: r.tag_name, url: r.html_url, name: r.name || r.tag_name }
}

/** The public page /releases/latest redirects to /releases/tag/<tag>. That redirect has no hourly limit. */
async function fromWebRedirect(): Promise<Release | null> {
  const res = await fetch(`https://github.com/${RELEASES_REPO}/releases/latest`, {
    redirect: 'manual',
    headers: { 'User-Agent': 'GitDog' }
  })
  const location = res.headers.get('location')
  const tag = location?.match(/\/releases\/tag\/([^/?#]+)/)?.[1]
  if (!location || !tag) return null
  return { tag: decodeURIComponent(tag), url: new URL(location, 'https://github.com').toString(), name: decodeURIComponent(tag) }
}

async function latest(): Promise<Release | null> {
  for (const source of [fromApi, fromWebRedirect]) {
    try {
      const release = await source()
      if (release) return release
    } catch {
      /* try the next source */
    }
  }
  return null
}

/** Looks for a newer release of the public repository. `failed` tells "could not check" apart from "up to date". */
export async function checkForUpdate(current: string, arch: string = process.arch): Promise<UpdateCheck> {
  const release = await latest()
  if (!release) return { current, update: null, failed: true, unsupported: false }
  if (!isNewer(release.tag, current)) return { current, update: null, failed: false, unsupported: false }
  // Releases after LAST_INTEL_VERSION are built for Apple Silicon only. Do not offer them to an Intel Mac.
  if (arch !== 'arm64' && isNewer(release.tag, LAST_INTEL_VERSION)) return { current, update: null, failed: false, unsupported: true }
  const update: UpdateInfo = { version: release.tag.replace(/^v/i, ''), url: release.url, name: release.name }
  return { current, update, failed: false, unsupported: false }
}
