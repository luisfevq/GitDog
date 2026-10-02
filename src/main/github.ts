import type { Repo } from '../shared/types'

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
    if (res.status === 401) throw new Error('Token inválido o expirado.')
    let detail = ''
    try {
      const body = (await res.json()) as { message?: string; errors?: { message?: string }[] }
      detail = [body.message, ...(body.errors ?? []).map((e) => e.message)].filter(Boolean).join(' - ')
    } catch {
      /* no JSON body */
    }
    if (res.status === 403 || res.status === 404) {
      detail ||= 'Sin permisos. Revisa que el token tenga el permiso "repo".'
    }
    throw new Error(`GitHub respondió ${res.status}${detail ? `: ${detail}` : ''}`)
  }
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
