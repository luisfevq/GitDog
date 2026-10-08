import type {
  MergeEmail,
  MergeMethod,
  PullDetail,
  PullEvent,
  PullFile,
  PullRequest,
  Repo,
  ReviewEvent
} from '../shared/types'
import { createReadStream, statSync } from 'fs'
import http from 'http'
import https from 'https'
import { basename, extname } from 'path'
import { t } from './lang'

const API = 'https://api.github.com'

export interface GitHubUser {
  login: string
  id: number
  name: string | null
  avatarUrl: string
  email: string | null
}

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'GitDog',
      ...(init.body ? { 'Content-Type': 'application/json' } : {})
    }
  })
  if (!res.ok) {
    if (res.status === 401) throw new Error(t('err.tokenInvalid'))
    let detail = ''
    try {
      const body = (await res.json()) as { message?: string; errors?: { message?: string }[] }
      detail = [body.message, ...(body.errors ?? []).map((e) => e.message)].filter(Boolean).join(' - ')
    } catch {
      /* no JSON body */
    }
    if (res.status === 403 || res.status === 404) {
      detail ||= t('err.noPermission')
    }
    throw new Error(t('err.githubStatus', { status: res.status, detail: detail ? `: ${detail}` : '' }))
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export async function fetchUser(token: string): Promise<GitHubUser> {
  const u = await request<{
    login: string
    id: number
    name: string | null
    avatar_url: string
    email: string | null
  }>(token, '/user')
  return { login: u.login, id: u.id, name: u.name, avatarUrl: u.avatar_url, email: u.email }
}

interface ApiRepo {
  full_name: string
  name: string
  owner: { login: string }
  private: boolean
  description: string | null
  clone_url: string
  pushed_at: string | null
}

const toRepo = (r: ApiRepo): Repo => ({
  fullName: r.full_name,
  name: r.name,
  owner: r.owner.login,
  private: r.private,
  description: r.description,
  cloneUrl: r.clone_url,
  pushedAt: r.pushed_at
})

export async function fetchRepos(token: string): Promise<Repo[]> {
  const repos: Repo[] = []
  for (let page = 1; page <= 10; page++) {
    const batch = await request<ApiRepo[]>(
      token,
      `/user/repos?per_page=100&page=${page}&sort=pushed&affiliation=owner,collaborator,organization_member`
    )
    repos.push(...batch.map(toRepo))
    if (batch.length < 100) break
  }
  return repos
}

export async function createRepo(
  token: string,
  options: { name: string; description: string; private: boolean }
): Promise<Repo> {
  const r = await request<ApiRepo>(token, '/user/repos', {
    method: 'POST',
    body: JSON.stringify({
      name: options.name,
      description: options.description || undefined,
      private: options.private
    })
  })
  return toRepo(r)
}

interface ApiRepoRef {
  full_name: string
  allow_merge_commit?: boolean
  allow_squash_merge?: boolean
  allow_rebase_merge?: boolean
}

interface ApiPull {
  number: number
  title: string
  state: string
  draft?: boolean
  merged_at: string | null
  user: { login: string; avatar_url: string } | null
  node_id?: string
  head: { ref: string; sha?: string; repo?: ApiRepoRef | null }
  base: { ref: string; repo?: ApiRepoRef | null }
  html_url: string
  created_at: string
  updated_at: string
  body: string | null
}

const toPull = (p: ApiPull): PullRequest => ({
  number: p.number,
  title: p.title,
  state: p.merged_at ? 'merged' : p.state === 'open' ? 'open' : 'closed',
  draft: !!p.draft,
  author: p.user?.login ?? 'ghost',
  authorAvatar: p.user?.avatar_url ?? '',
  head: p.head.ref,
  base: p.base.ref,
  url: p.html_url,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
  body: p.body ?? ''
})

const repoPath = (owner: string, repo: string): string =>
  `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`

export async function fetchPulls(
  token: string,
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all'
): Promise<PullRequest[]> {
  const list = await request<ApiPull[]>(
    token,
    `${repoPath(owner, repo)}/pulls?state=${state}&per_page=50&sort=updated&direction=desc`
  )
  return list.map(toPull)
}

export async function fetchPull(token: string, owner: string, repo: string, number: number): Promise<PullDetail> {
  const p = await request<
    ApiPull & {
      additions: number
      deletions: number
      changed_files: number
      commits: number
      comments: number
      review_comments: number
      mergeable: boolean | null
      mergeable_state: string
    }
  >(token, `${repoPath(owner, repo)}/pulls/${number}`)
  const target = p.base.repo
  const mergeMethods: MergeMethod[] = []
  if (target?.allow_merge_commit !== false) mergeMethods.push('merge')
  if (target?.allow_squash_merge !== false) mergeMethods.push('squash')
  if (target?.allow_rebase_merge !== false) mergeMethods.push('rebase')
  return {
    ...toPull(p),
    additions: p.additions,
    deletions: p.deletions,
    changedFiles: p.changed_files,
    commits: p.commits,
    comments: p.comments + p.review_comments,
    mergeable: p.mergeable,
    mergeableState: p.mergeable_state,
    mergeMethods,
    sameRepo: !!p.head.repo && !!target && p.head.repo.full_name === target.full_name,
    nodeId: p.node_id ?? '',
    headSha: p.head.sha ?? ''
  }
}

export async function fetchDefaultBranch(token: string, owner: string, repo: string): Promise<string> {
  const r = await request<{ default_branch: string }>(token, repoPath(owner, repo))
  return r.default_branch
}

export async function fetchBranches(token: string, owner: string, repo: string): Promise<string[]> {
  const names: string[] = []
  for (let page = 1; page <= 5; page++) {
    const batch = await request<{ name: string }[]>(token, `${repoPath(owner, repo)}/branches?per_page=100&page=${page}`)
    names.push(...batch.map((b) => b.name))
    if (batch.length < 100) break
  }
  return names
}

export async function createPull(
  token: string,
  owner: string,
  repo: string,
  input: { title: string; body: string; head: string; base: string; draft: boolean }
): Promise<PullRequest> {
  const p = await request<ApiPull>(token, `${repoPath(owner, repo)}/pulls`, {
    method: 'POST',
    body: JSON.stringify(input)
  })
  return toPull(p)
}

interface ApiUser {
  login: string
  avatar_url: string
}

export async function fetchPullFiles(token: string, owner: string, repo: string, number: number): Promise<PullFile[]> {
  const files: PullFile[] = []
  for (let page = 1; page <= 3; page++) {
    const batch = await request<
      {
        filename: string
        previous_filename?: string
        status: string
        additions: number
        deletions: number
        patch?: string
      }[]
    >(token, `${repoPath(owner, repo)}/pulls/${number}/files?per_page=100&page=${page}`)
    files.push(
      ...batch.map((f) => ({
        path: f.filename,
        previousPath: f.previous_filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch ?? null
      }))
    )
    if (batch.length < 100) break
  }
  return files
}

export async function fetchPullConversation(
  token: string,
  owner: string,
  repo: string,
  number: number
): Promise<PullEvent[]> {
  const base = repoPath(owner, repo)
  const [reviews, comments, lines] = await Promise.all([
    request<{ id: number; user: ApiUser | null; body: string | null; state: string; submitted_at: string | null }[]>(
      token,
      `${base}/pulls/${number}/reviews?per_page=100`
    ),
    request<{ id: number; user: ApiUser | null; body: string; created_at: string }[]>(
      token,
      `${base}/issues/${number}/comments?per_page=100`
    ),
    request<{ id: number; user: ApiUser | null; body: string; created_at: string; path: string }[]>(
      token,
      `${base}/pulls/${number}/comments?per_page=100`
    )
  ])

  const who = (u: ApiUser | null): { author: string; authorAvatar: string } => ({
    author: u?.login ?? 'ghost',
    authorAvatar: u?.avatar_url ?? ''
  })

  const events: PullEvent[] = [
    ...reviews
      // A "commented" review without text only wraps line comments, which are listed below.
      .filter((r) => r.state !== 'PENDING' && r.submitted_at && (r.state !== 'COMMENTED' || r.body?.trim()))
      .map((r) => ({
        id: `r${r.id}`,
        kind: 'review' as const,
        ...who(r.user),
        state: r.state,
        body: r.body ?? '',
        createdAt: r.submitted_at as string
      })),
    ...comments.map((c) => ({
      id: `c${c.id}`,
      kind: 'comment' as const,
      ...who(c.user),
      body: c.body,
      createdAt: c.created_at
    })),
    ...lines.map((c) => ({
      id: `l${c.id}`,
      kind: 'line' as const,
      ...who(c.user),
      body: c.body,
      path: c.path,
      createdAt: c.created_at
    }))
  ]
  return events.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function submitReview(
  token: string,
  owner: string,
  repo: string,
  number: number,
  event: ReviewEvent,
  body: string
): Promise<void> {
  await request(token, `${repoPath(owner, repo)}/pulls/${number}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ event, ...(body ? { body } : {}) })
  })
}

export async function mergePull(
  token: string,
  owner: string,
  repo: string,
  number: number,
  method: MergeMethod
): Promise<void> {
  const r = await request<{ merged: boolean; message: string }>(token, `${repoPath(owner, repo)}/pulls/${number}/merge`, {
    method: 'PUT',
    body: JSON.stringify({ merge_method: method })
  })
  if (!r.merged) throw new Error(r.message || t('err.githubMergeFailed'))
}

export async function deleteBranch(token: string, owner: string, repo: string, branch: string): Promise<void> {
  const ref = branch.split('/').map(encodeURIComponent).join('/')
  await request(token, `${repoPath(owner, repo)}/git/refs/heads/${ref}`, { method: 'DELETE' })
}

/** Open pull request whose head is `branch` in the same repository, or null. */
export async function fetchBranchPull(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<PullRequest | null> {
  const head = encodeURIComponent(`${owner}:${branch}`)
  const list = await request<ApiPull[]>(token, `${repoPath(owner, repo)}/pulls?state=open&head=${head}&per_page=1`)
  return list[0] ? toPull(list[0]) : null
}

/**
 * Verified emails of the account. Needs the user:email permission, which a token with only "repo" does not have.
 * Throws when GitHub refuses.
 */
export async function fetchVerifiedEmails(token: string): Promise<{ email: string; primary: boolean }[]> {
  const list = await request<{ email: string; primary: boolean; verified: boolean }[]>(token, '/user/emails')
  return list.filter((e) => e.verified).map((e) => ({ email: e.email, primary: e.primary }))
}

/**
 * Merge with a chosen email for the merge commit. The REST merge endpoint cannot do this, GraphQL can.
 * The email must be verified on the account, or be its private @users.noreply.github.com address.
 */
export async function mergePullWithEmail(
  token: string,
  pull: { nodeId: string; headSha: string },
  method: MergeMethod,
  email: string
): Promise<void> {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'GitDog' },
    body: JSON.stringify({
      query: `mutation($id: ID!, $method: PullRequestMergeMethod!, $email: String, $oid: GitObjectID) {
        mergePullRequest(input: { pullRequestId: $id, mergeMethod: $method, authorEmail: $email, expectedHeadOid: $oid }) {
          pullRequest { merged }
        }
      }`,
      variables: { id: pull.nodeId, method: method.toUpperCase(), email, oid: pull.headSha || null }
    })
  })
  const body = (await res.json().catch(() => ({}))) as { errors?: { message: string }[]; message?: string }
  if (!res.ok || body.errors?.length) {
    throw new Error(`GitHub: ${body.errors?.[0]?.message ?? body.message ?? t('err.githubReplied', { status: res.status })}`)
  }
}

/** Creates a release as a draft: the tag is not created and nobody sees it until it is published. */
export async function createDraftRelease(
  token: string,
  owner: string,
  repo: string,
  input: { tag: string; name: string; body: string; generate: boolean; prerelease: boolean }
): Promise<{ id: number; uploadUrl: string; htmlUrl: string }> {
  const r = await request<{ id: number; upload_url: string; html_url: string }>(token, `${repoPath(owner, repo)}/releases`, {
    method: 'POST',
    body: JSON.stringify({
      tag_name: input.tag,
      name: input.name,
      body: input.body || undefined,
      draft: true,
      prerelease: input.prerelease,
      generate_release_notes: input.generate
    })
  })
  // upload_url comes as a template: ".../assets{?name,label}"
  return { id: r.id, uploadUrl: r.upload_url.replace(/\{.*$/, ''), htmlUrl: r.html_url }
}

export async function publishRelease(token: string, owner: string, repo: string, id: number): Promise<string> {
  const r = await request<{ html_url: string }>(token, `${repoPath(owner, repo)}/releases/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ draft: false })
  })
  return r.html_url
}

export async function deleteRelease(token: string, owner: string, repo: string, id: number): Promise<void> {
  await request(token, `${repoPath(owner, repo)}/releases/${id}`, { method: 'DELETE' })
}

const CONTENT_TYPES: Record<string, string> = {
  '.dmg': 'application/x-apple-diskimage',
  '.zip': 'application/zip',
  '.pkg': 'application/octet-stream',
  '.json': 'application/json',
  '.yml': 'text/yaml',
  '.txt': 'text/plain',
  '.md': 'text/markdown'
}

/** Streams a file to a release. `onBytes` reports how much was read so far, for a progress bar. */
export function uploadAsset(
  token: string,
  uploadUrl: string,
  filePath: string,
  onBytes: (sent: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const total = statSync(filePath).size
    const url = new URL(uploadUrl)
    url.searchParams.set('name', basename(filePath))
    const transport = url.protocol === 'http:' ? http : https

    const req = transport.request(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'GitDog',
          'Content-Type': CONTENT_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
          'Content-Length': total
        }
      },
      (res) => {
        let body = ''
        res.on('data', (chunk: Buffer) => (body += chunk.toString()))
        res.on('end', () => {
          if (res.statusCode && res.statusCode < 300) return resolve()
          let detail = ''
          try {
            const parsed = JSON.parse(body) as { message?: string; errors?: { code?: string }[] }
            detail = [parsed.message, ...(parsed.errors ?? []).map((e) => e.code)].filter(Boolean).join(' - ')
          } catch {
            /* no JSON body */
          }
          reject(new Error(t('err.githubStatus', { status: res.statusCode ?? 0, detail: detail ? `: ${detail}` : '' })))
        })
      }
    )
    req.on('error', reject)

    let sent = 0
    const stream = createReadStream(filePath)
    stream.on('data', (chunk: string | Buffer) => {
      sent += chunk.length
      onBytes(sent, total)
    })
    stream.on('error', reject)
    stream.pipe(req)
  })
}

/** True when a published release already uses this tag. Any error counts as "no": creating it will say more. */
export async function releaseExists(token: string, owner: string, repo: string, tag: string): Promise<boolean> {
  try {
    await request(token, `${repoPath(owner, repo)}/releases/tags/${encodeURIComponent(tag)}`)
    return true
  } catch {
    return false
  }
}
