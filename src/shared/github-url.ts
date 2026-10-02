/** Browser URL of a GitHub remote (HTTPS or SSH form). Null for other hosts. */
export function githubWebUrl(remote: string | null): string | null {
  if (!remote) return null
  const m = remote.match(/github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/)
  return m ? `https://github.com/${m[1]}/${m[2]}` : null
}
