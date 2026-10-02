import { execFile } from 'child_process'
import { chmodSync, realpathSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { CommitInfo, FileChange, RepoStatus } from '../shared/types'

/** Credentials of the account that owns a project. Passed per command, never written to disk. */
export interface Auth {
  login: string
  token: string
  name: string
  email: string
}

interface RunOptions {
  /** Talks to the remote: inject the account token. */
  auth?: Auth
  /** Commits: force the account identity, whatever the repo config says. */
  identity?: Auth
  /** Exit codes that are not errors. */
  okCodes?: number[]
}

interface RunResult {
  stdout: string
  stderr: string
  code: number
}

const ASKPASS_SCRIPT = `#!/bin/sh
case "$1" in
  Username*) printf '%s' "$GITDOG_USER" ;;
  *) printf '%s' "$GITDOG_TOKEN" ;;
esac
`

let askpassPath = ''

export function initGit(userDataDir: string): void {
  askpassPath = join(userDataDir, 'askpass.sh')
  writeFileSync(askpassPath, ASKPASS_SCRIPT, { mode: 0o700 })
  chmodSync(askpassPath, 0o700)
}

export function git(cwd: string, args: string[], options: RunOptions = {}): Promise<RunResult> {
  const fullArgs = ['-c', 'core.quotepath=false']
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C' }

  if (options.identity) {
    fullArgs.push('-c', `user.name=${options.identity.name}`, '-c', `user.email=${options.identity.email}`)
  }
  if (options.auth) {
    fullArgs.push(
      // Ignore the macOS keychain helper so another account's login is never used by accident.
      '-c',
      'credential.helper=',
      // Remotes saved as SSH still go through HTTPS and the account token.
      '-c',
      'url.https://github.com/.insteadOf=git@github.com:',
      '-c',
      'url.https://github.com/.insteadOf=ssh://git@github.com/'
    )
    env.GIT_ASKPASS = askpassPath
    env.GITDOG_USER = options.auth.login
    env.GITDOG_TOKEN = options.auth.token
  }
  fullArgs.push(...args)

  const okCodes = options.okCodes ?? [0]
  const secret = options.auth?.token

  return new Promise((resolve, reject) => {
    execFile(
      'git',
      fullArgs,
      { cwd, env, maxBuffer: 32 * 1024 * 1024, encoding: 'utf8' },
      (error, stdout, stderr) => {
        const code = error ? (typeof error.code === 'number' ? error.code : -1) : 0
        if (okCodes.includes(code)) {
          resolve({ stdout, stderr, code })
          return
        }
        let message = (stderr || error?.message || 'Error desconocido de git').trim()
        if (secret) message = message.split(secret).join('***')
        reject(new Error(message))
      }
    )
  })
}

function parseBranchHeader(raw: string): Pick<RepoStatus, 'branch' | 'upstream' | 'ahead' | 'behind'> {
  let header = raw
  let ahead = 0
  let behind = 0
  const tracking = header.match(/\s\[(.+)\]$/)
  if (tracking && tracking.index !== undefined) {
    ahead = Number(tracking[1].match(/ahead (\d+)/)?.[1] ?? 0)
    behind = Number(tracking[1].match(/behind (\d+)/)?.[1] ?? 0)
    header = header.slice(0, tracking.index)
  }
  const unborn = header.match(/^(?:No commits yet|Initial commit) on (.+)$/)
  if (unborn) return { branch: unborn[1], upstream: null, ahead, behind }
  if (header.startsWith('HEAD (no branch)')) return { branch: null, upstream: null, ahead, behind }
  const [branch, upstream] = header.split('...')
  return { branch, upstream: upstream ?? null, ahead, behind }
}

export async function status(cwd: string): Promise<RepoStatus> {
  const [{ stdout }, head, remote] = await Promise.all([
    git(cwd, ['status', '--porcelain=v1', '-z', '-b', '--untracked-files=all']),
    git(cwd, ['rev-parse', '-q', '--verify', 'HEAD'], { okCodes: [0, 1, 128] }),
    git(cwd, ['config', '--get', 'remote.origin.url'], { okCodes: [0, 1] })
  ])

  const parts = stdout.split('\0')
  const header = parts.shift() ?? ''
  const files: FileChange[] = []

  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i]
    if (!entry) continue
    const x = entry[0]
    const y = entry[1]
    const path = entry.slice(3)
    let orig: string | undefined
    if (x === 'R' || x === 'C') orig = parts[++i]

    const untracked = x === '?'
    const conflict = x === 'U' || y === 'U' || (x === 'A' && y === 'A') || (x === 'D' && y === 'D')
    files.push({
      path,
      orig,
      untracked,
      staged: !untracked && !conflict && x !== ' ',
      status: untracked ? '?' : conflict ? 'U' : y !== ' ' ? y : x
    })
  }

  return {
    ...parseBranchHeader(header.replace(/^## /, '')),
    hasCommits: head.code === 0,
    hasRemote: remote.stdout.trim().length > 0,
    remoteUrl: remote.stdout.trim() || null,
    files
  }
}

const MAX_DIFF_CHARS = 400_000

export async function diff(cwd: string, file: FileChange): Promise<string> {
  let out: string
  if (file.untracked) {
    out = (await git(cwd, ['diff', '--no-index', '--', '/dev/null', file.path], { okCodes: [0, 1] })).stdout
  } else {
    const paths = file.orig ? [file.orig, file.path] : [file.path]
    try {
      out = (await git(cwd, ['diff', 'HEAD', '-M', '--', ...paths])).stdout
    } catch {
      // No commit yet: only the index exists.
      out = (await git(cwd, ['diff', '--cached', '--', ...paths])).stdout
    }
  }
  return out.length > MAX_DIFF_CHARS ? `${out.slice(0, MAX_DIFF_CHARS)}\n\n… diff demasiado grande, recortado.` : out
}

export async function stage(cwd: string, paths: string[]): Promise<void> {
  await git(cwd, ['add', '-A', '--', ...paths])
}

export async function unstage(cwd: string, paths: string[]): Promise<void> {
  try {
    await git(cwd, ['reset', '-q', 'HEAD', '--', ...paths])
  } catch {
    // No commit yet: remove from the index only.
    await git(cwd, ['rm', '--cached', '-r', '-q', '--', ...paths])
  }
}

export async function commit(cwd: string, message: string, identity: Auth): Promise<void> {
  await git(cwd, ['commit', '-m', message], { identity })
}

export async function push(cwd: string, auth: Auth): Promise<string> {
  const { stdout, stderr } = await git(cwd, ['push', '--set-upstream', 'origin', 'HEAD'], { auth })
  return (stderr || stdout).trim()
}

export async function pull(cwd: string, auth: Auth): Promise<string> {
  const { stdout, stderr } = await git(cwd, ['pull', '--ff-only'], { auth })
  return (stdout || stderr).trim()
}

export async function branches(cwd: string): Promise<string[]> {
  const { stdout } = await git(cwd, ['for-each-ref', '--format=%(refname:short)', 'refs/heads'])
  return stdout.split('\n').filter(Boolean)
}

export async function checkout(cwd: string, branch: string, create: boolean): Promise<void> {
  await git(cwd, create ? ['checkout', '-b', branch] : ['checkout', branch])
}

export async function log(cwd: string): Promise<CommitInfo[]> {
  const { stdout } = await git(cwd, ['log', '-n', '100', '--format=%H%x1f%an%x1f%ar%x1f%s'], {
    okCodes: [0, 128]
  })
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, author, date, subject] = line.split('\x1f')
      return { hash, author, date, subject }
    })
}

/** True only when `path` is the root of a repo, not a folder inside one. */
export async function isRepo(path: string): Promise<boolean> {
  try {
    const { stdout } = await git(path, ['rev-parse', '--show-toplevel'], { okCodes: [0, 128] })
    const top = stdout.trim()
    return top.length > 0 && realpathSync(top) === realpathSync(path)
  } catch {
    return false
  }
}

export async function init(path: string): Promise<void> {
  await git(path, ['init', '-b', 'main'])
}

export async function remoteUrl(cwd: string): Promise<string | null> {
  const { stdout } = await git(cwd, ['config', '--get', 'remote.origin.url'], { okCodes: [0, 1] })
  return stdout.trim() || null
}

export async function addRemote(cwd: string, url: string): Promise<void> {
  await git(cwd, ['remote', 'add', 'origin', url])
}

export async function clone(parentDir: string, url: string, name: string, auth: Auth): Promise<void> {
  await git(parentDir, ['clone', url, name], { auth })
}
