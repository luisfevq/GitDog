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

async function latest(token?: string): Promise<Release | null> {
  const res = await fetch(`https://api.github.com/repos/${RELEASES_REPO}/releases/latest`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'GitDog',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  })
  return res.ok ? ((await res.json()) as Release) : null
}

/**
 * Looks for a newer release. Public repos answer without a token. While the repo is private,
 * the accounts signed in to GitDog are tried, so the check also works for the owner.
 * Any failure counts as "no update".
 */
export async function checkForUpdate(current: string, tokens: string[]): Promise<UpdateInfo | null> {
  try {
    let release = await latest()
    for (const token of tokens) {
      if (release) break
      release = await latest(token)
    }
    if (!release || !isNewer(release.tag_name, current)) return null
    return { version: release.tag_name.replace(/^v/i, ''), url: release.html_url, name: release.name || release.tag_name }
  } catch {
    return null
  }
}
