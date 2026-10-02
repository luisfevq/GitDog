export interface RepoRef {
  owner: string
  repo: string
}

/** Owner and name from a GitHub remote (HTTPS or SSH form). Null for other hosts. */
export function githubRepoRef(remote: string | null): RepoRef | null {
  if (!remote) return null
  const m = remote.match(/github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/)
  return m ? { owner: m[1], repo: m[2] } : null
}

/** Browser URL of a GitHub remote. Null for other hosts. */
export function githubWebUrl(remote: string | null): string | null {
  const ref = githubRepoRef(remote)
  return ref ? `https://github.com/${ref.owner}/${ref.repo}` : null
}
