import type { UpdateInfo } from '../shared/types'
import { RELEASES_REPO } from '../shared/app-info'

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
  tag_name: string
  html_url: string
  name: string | null
}

/** Looks for a newer release of the public repository. Any failure counts as "no update". */
export async function checkForUpdate(current: string): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${RELEASES_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'GitDog' }
    })
    if (!res.ok) return null
    const release = (await res.json()) as Release
    if (!isNewer(release.tag_name, current)) return null
    return { version: release.tag_name.replace(/^v/i, ''), url: release.html_url, name: release.name || release.tag_name }
  } catch {
    return null
  }
}
