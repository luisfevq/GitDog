import { execFile, spawn } from 'child_process'
import { appendFileSync, chmodSync, existsSync, readFileSync, realpathSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import type {
  BranchInfo,
  CommitDetail,
  CommitFile,
  CommitInfo,
  FileChange,
  GitProgress,
  LastCommit,
  PullResult,
  RepoStatus,
  TagInfo
} from '../shared/types'
import { t } from './lang'

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

function build(args: string[], options: RunOptions): { fullArgs: string[]; env: NodeJS.ProcessEnv } {
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
  return { fullArgs, env }
}

export function git(cwd: string, args: string[], options: RunOptions = {}): Promise<RunResult> {
  const { fullArgs, env } = build(args, options)
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

type Progress = Pick<GitProgress, 'phase' | 'percent'>

const PROGRESS_RE =
  /(Enumerating objects|Counting objects|Compressing objects|Writing objects|Receiving objects|Resolving deltas|Checking connectivity)[^:]*:\s*(?:(\d+)%)?/

function parseProgress(line: string): Progress | null {
  const m = line.match(PROGRESS_RE)
  return m ? { phase: m[1], percent: m[2] ? Number(m[2]) : null } : null
}

/** Like git(), but reports the progress lines that git writes while it sends or receives data. */
export function gitProgress(
  cwd: string,
  args: string[],
  options: RunOptions,
  onProgress: (progress: Progress) => void
): Promise<RunResult> {
  const { fullArgs, env } = build(args, options)
  const okCodes = options.okCodes ?? [0]
  const secret = options.auth?.token

  return new Promise((resolve, reject) => {
    const child = spawn('git', fullArgs, { cwd, env })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderr += text
      // Git rewrites the same line with \r while it works.
      for (const line of text.split(/[\r\n]+/)) {
        const progress = parseProgress(line)
        if (progress) onProgress(progress)
      }
    })
    child.on('error', (error) => reject(error))
    child.on('close', (code) => {
      if (okCodes.includes(code ?? -1)) {
        resolve({ stdout, stderr, code: code ?? 0 })
        return
      }
      let message = stderr
        .split(/[\r\n]+/)
        .filter((line) => line && !PROGRESS_RE.test(line))
        .join('\n')
        .trim()
      if (secret) message = message.split(secret).join('***')
      reject(new Error(message || t('err.gitUnknown')))
    })
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

function parseLastCommit(output: string, hasRemote: boolean, unpushed: number): LastCommit | null {
  const [hash, subject, date, parents] = output.trim().split('\x1f')
  if (!hash) return null
  const parentCount = (parents ?? '').split(' ').filter(Boolean).length
  // Without a remote nothing can be "pushed", so every commit counts as local.
  const local = hasRemote ? unpushed > 0 : true
  return { hash, subject, date, canUndo: parentCount === 1 && local }
}

/** When the project last talked to GitHub: the modification time of .git/FETCH_HEAD. */
function fetchedAt(cwd: string): string | null {
  try {
    return statSync(join(cwd, '.git', 'FETCH_HEAD')).mtime.toISOString()
  } catch {
    return null
  }
}

export async function status(cwd: string): Promise<RepoStatus> {
  const [{ stdout }, head, remote, tagList, lastLog] = await Promise.all([
    git(cwd, ['status', '--porcelain=v1', '-z', '-b', '--untracked-files=all']),
    git(cwd, ['rev-parse', '-q', '--verify', 'HEAD'], { okCodes: [0, 1, 128] }),
    git(cwd, ['config', '--get', 'remote.origin.url'], { okCodes: [0, 1] }),
    git(cwd, ['tag', '--list']),
    git(cwd, ['log', '-1', '--format=%H%x1f%s%x1f%aI%x1f%P'], { okCodes: [0, 128] })
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

  const branchInfo = parseBranchHeader(header.replace(/^## /, ''))
  const hasRemote = remote.stdout.trim().length > 0
  const [savedChanges, unpushed] = await Promise.all([
    branchInfo.branch ? savedChangesRef(cwd, branchInfo.branch) : Promise.resolve(null),
    hasRemote && head.code === 0
      ? git(cwd, ['rev-list', '--count', 'HEAD', '--not', '--remotes=origin'], { okCodes: [0, 128] })
      : Promise.resolve({ stdout: '0' })
  ])

  return {
    ...branchInfo,
    hasCommits: head.code === 0,
    headHash: head.code === 0 ? head.stdout.trim() : null,
    hasRemote,
    remoteUrl: remote.stdout.trim() || null,
    unpushed: Number(unpushed.stdout.trim()) || 0,
    lastCommit: parseLastCommit(lastLog.stdout, hasRemote, Number(unpushed.stdout.trim()) || 0),
    lastFetch: fetchedAt(cwd),
    savedChanges,
    tagCount: tagList.stdout.split('\n').filter(Boolean).length,
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

export async function push(cwd: string, auth: Auth, onProgress: (p: Progress) => void = () => undefined): Promise<string> {
  const { stdout, stderr } = await gitProgress(cwd, ['push', '--progress', '--set-upstream', 'origin', 'HEAD'], { auth }, onProgress)
  return (stderr || stdout).trim()
}

export async function pull(
  cwd: string,
  auth: Auth,
  onProgress: (p: Progress) => void = () => undefined
): Promise<PullResult> {
  const { stdout, stderr } = await gitProgress(cwd, ['pull', '--ff-only', '--progress'], { auth }, onProgress)
  const output = `${stdout}\n${stderr}`
  if (/Already up[ -]to[ -]date/i.test(output)) return { upToDate: true, files: null }
  const changed = output.match(/(\d+) files? changed/)
  return { upToDate: false, files: changed ? Number(changed[1]) : null }
}

export async function fetchRemote(cwd: string, auth: Auth, onProgress: (p: Progress) => void = () => undefined): Promise<void> {
  await gitProgress(cwd, ['fetch', '--prune', '--progress', 'origin'], { auth }, onProgress)
}

export async function branches(cwd: string): Promise<BranchInfo[]> {
  const { stdout } = await git(cwd, [
    'for-each-ref',
    '--sort=-committerdate',
    '--format=%(refname:short)%1f%(committerdate:iso-strict)',
    'refs/heads'
  ])
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name, date] = line.split('\x1f')
      return { name, date }
    })
}

export async function checkout(cwd: string, branch: string, create: boolean): Promise<void> {
  await git(cwd, create ? ['checkout', '-b', branch] : ['checkout', branch])
}

/** "HEAD -> main, tag: v1, origin/main" -> ["main", "tag: v1"]. A remote branch shows only when it has no local twin. */
function parseRefs(decoration: string): string[] {
  const names = decoration
    .split(', ')
    .map((r) => r.replace(/^HEAD -> /, '').trim())
    .filter((r) => r && r !== 'HEAD' && !r.endsWith('/HEAD'))
  const local = new Set(names.filter((r) => !r.startsWith('tag: ') && !r.startsWith('origin/')))
  return names.filter((r) => !(r.startsWith('origin/') && local.has(r.slice('origin/'.length))))
}

export async function log(cwd: string, hasRemote: boolean): Promise<CommitInfo[]> {
  const [{ stdout }, pending] = await Promise.all([
    git(cwd, ['log', '-n', '100', '--format=%H%x1f%an%x1f%ae%x1f%aI%x1f%D%x1f%s'], { okCodes: [0, 128] }),
    hasRemote
      ? git(cwd, ['rev-list', '-n', '100', 'HEAD', '--not', '--remotes=origin'], { okCodes: [0, 128] })
      : Promise.resolve({ stdout: '' })
  ])
  const unpushed = new Set(pending.stdout.split('\n').filter(Boolean))
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, author, email, date, decoration, subject] = line.split('\x1f')
      return { hash, author, email, date, subject, refs: parseRefs(decoration ?? ''), unpushed: unpushed.has(hash) }
    })
}

/** Files of one commit. For merge commits, the diff is against the first parent. */
export async function commitDetail(cwd: string, hash: string): Promise<CommitDetail> {
  const [names, body] = await Promise.all([
    git(cwd, ['show', '-m', '--first-parent', '-M', '--name-status', '--format=', hash]),
    git(cwd, ['show', '-s', '--format=%b', hash])
  ])
  const files: CommitFile[] = names.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [code, first, second] = line.split('\t')
      const status = code[0]
      return status === 'R' || status === 'C' ? { status, orig: first, path: second } : { status, path: first }
    })
  return { body: body.stdout.trim(), files }
}

export async function commitDiff(cwd: string, hash: string, file: CommitFile): Promise<string> {
  const paths = file.orig ? [file.orig, file.path] : [file.path]
  const { stdout } = await git(cwd, ['show', '-m', '--first-parent', '-M', '--format=', hash, '--', ...paths])
  return stdout.length > MAX_DIFF_CHARS ? `${stdout.slice(0, MAX_DIFF_CHARS)}\n\n… diff demasiado grande, recortado.` : stdout
}

/** Commits that `branch` has and the current branch does not. */
export async function mergePreview(cwd: string, branch: string): Promise<number> {
  const { stdout } = await git(cwd, ['rev-list', '--count', `HEAD..refs/heads/${branch}`])
  return Number(stdout.trim()) || 0
}

/** Merges a local branch into the current one. On conflicts the merge is cancelled and the files are listed. */
export async function mergeBranch(cwd: string, branch: string, identity: Auth): Promise<string> {
  try {
    const { stdout } = await git(cwd, ['merge', '--no-edit', branch], { identity })
    return stdout.trim()
  } catch (error) {
    const merging = (await git(cwd, ['rev-parse', '-q', '--verify', 'MERGE_HEAD'], { okCodes: [0, 1, 128] })).code === 0
    if (!merging) throw error
    const conflicted = (await git(cwd, ['diff', '--name-only', '--diff-filter=U'], { okCodes: [0, 128] })).stdout
      .split('\n')
      .filter(Boolean)
    await git(cwd, ['merge', '--abort'], { okCodes: [0, 128] })
    const shown = conflicted.slice(0, 5).join(', ')
    throw new Error(
      t('err.mergeConflicts', {
        branch,
        files: shown ? ` (${shown}${conflicted.length > 5 ? ', …' : ''})` : ''
      })
    )
  }
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

export async function clone(
  parentDir: string,
  url: string,
  name: string,
  auth: Auth,
  onProgress: (p: Progress) => void = () => undefined
): Promise<void> {
  await gitProgress(parentDir, ['clone', '--progress', url, name], { auth }, onProgress)
}

export async function tags(cwd: string, auth: Auth): Promise<TagInfo[]> {
  const { stdout } = await git(cwd, [
    'tag',
    '--sort=-creatordate',
    '--format=%(refname:short)%1f%(objectname:short)%1f%(creatordate:iso-strict)%1f%(contents:subject)%1f%(objecttype)'
  ])

  let remote: Set<string> | null = null
  if (await remoteUrl(cwd)) {
    try {
      const out = (await git(cwd, ['ls-remote', '--tags', '--refs', 'origin'], { auth })).stdout
      remote = new Set(
        out
          .split('\n')
          .map((l) => l.split('\t')[1]?.replace('refs/tags/', ''))
          .filter((n): n is string => !!n)
      )
    } catch {
      remote = null // offline or no access: show the tags without remote status
    }
  }

  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name, hash, date, subject, type] = line.split('\x1f')
      return { name, hash, date, subject, annotated: type === 'tag', onRemote: remote ? remote.has(name) : null }
    })
}

export async function createTag(cwd: string, name: string, message: string, identity: Auth): Promise<void> {
  const args = message ? ['tag', '-a', name, '-m', message] : ['tag', name]
  await git(cwd, args, { identity })
}

export async function pushTag(cwd: string, name: string, auth: Auth): Promise<void> {
  await git(cwd, ['push', 'origin', `refs/tags/${name}`], { auth })
}

export async function deleteTag(cwd: string, name: string, alsoRemote: boolean, auth: Auth): Promise<void> {
  await git(cwd, ['tag', '-d', name])
  if (alsoRemote) await git(cwd, ['push', 'origin', `:refs/tags/${name}`], { auth })
}

/** Subjects of the commits on HEAD that origin/<base> does not have, newest first. */
export async function commitsAhead(cwd: string, base: string): Promise<string[]> {
  const { stdout } = await git(cwd, ['log', '--format=%s', `origin/${base}..HEAD`], { okCodes: [0, 128] })
  return stdout.split('\n').filter(Boolean)
}

/** Changes left on a branch are stashed with the message "gitdog:<branch>". */
export async function stashSave(cwd: string, branch: string): Promise<void> {
  await git(cwd, ['stash', 'push', '--include-untracked', '-m', `gitdog:${branch}`])
}

export async function stashPop(cwd: string, ref?: string): Promise<void> {
  await git(cwd, ref ? ['stash', 'pop', ref] : ['stash', 'pop'])
}

export async function savedChangesRef(cwd: string, branch: string): Promise<string | null> {
  const { stdout } = await git(cwd, ['stash', 'list', '--format=%gd%x1f%gs'], { okCodes: [0, 128] })
  for (const line of stdout.split('\n')) {
    const [ref, subject] = line.split('\x1f')
    if (ref && subject?.endsWith(`gitdog:${branch}`)) return ref
  }
  return null
}

async function refExists(cwd: string, ref: string): Promise<boolean> {
  return (await git(cwd, ['rev-parse', '-q', '--verify', ref], { okCodes: [0, 1, 128] })).code === 0
}

export async function isValidBranchName(cwd: string, name: string): Promise<boolean> {
  if (!name || name.startsWith('-')) return false
  return (await git(cwd, ['check-ref-format', '--branch', name], { okCodes: [0, 128] })).code === 0
}

/** New branch from `base` (a local branch, else origin/<base>), or from the current commit when base is null. */
export async function createBranchFrom(cwd: string, name: string, base: string | null): Promise<void> {
  if (!base) {
    await git(cwd, ['checkout', '-b', name])
    return
  }
  const start = (await refExists(cwd, `refs/heads/${base}`)) ? base : `origin/${base}`
  await git(cwd, ['checkout', '-b', name, '--no-track', start])
}

/**
 * Discards the changes of some files. Nothing is lost for good: the current version of each file goes
 * to the Trash (through `trash`) before it is restored from the last commit.
 */
export async function discardFiles(
  cwd: string,
  files: FileChange[],
  trash: (absolutePath: string) => Promise<void>
): Promise<void> {
  const hasHead = (await git(cwd, ['rev-parse', '-q', '--verify', 'HEAD'], { okCodes: [0, 1, 128] })).code === 0
  const inHead = async (path: string): Promise<boolean> =>
    hasHead && (await git(cwd, ['cat-file', '-e', `HEAD:${path}`], { okCodes: [0, 1, 128] })).code === 0

  for (const file of files) {
    const absolute = join(cwd, file.path)
    const exists = existsSync(absolute)

    // A new file: forget it in Git and send it to the Trash.
    if (file.untracked || !(await inHead(file.orig ?? file.path))) {
      if (!file.untracked) await git(cwd, ['rm', '--cached', '-f', '-r', '--', file.path], { okCodes: [0, 128] })
      if (exists) await trash(absolute)
      continue
    }
    // A rename: the new name goes away and the old file comes back.
    if (file.orig) {
      await git(cwd, ['rm', '--cached', '-f', '--', file.path], { okCodes: [0, 128] })
      if (exists) await trash(absolute)
      await git(cwd, ['checkout', 'HEAD', '--', file.orig])
      continue
    }
    if (exists && file.status !== 'D') await trash(absolute)
    await git(cwd, ['checkout', 'HEAD', '--', file.path])
  }
}

/** Adds a line to .gitignore unless it is already there. */
export function ignorePattern(cwd: string, pattern: string): void {
  const line = pattern.trim()
  if (!line || /[\r\n]/.test(pattern) || line.startsWith('#')) throw new Error(t('err.badPattern'))
  const file = join(cwd, '.gitignore')
  const current = existsSync(file) ? readFileSync(file, 'utf8') : ''
  if (current.split(/\r?\n/).includes(line)) return
  appendFileSync(file, `${current && !current.endsWith('\n') ? '\n' : ''}${line}\n`)
}

/** Undoes the last commit but keeps its changes (soft reset). Returns the commit message. */
export async function undoLastCommit(cwd: string): Promise<string> {
  const { stdout } = await git(cwd, ['log', '-1', '--format=%P%x1f%B'])
  const [parents, message] = stdout.split('\x1f')
  if (parents.trim().split(/\s+/).filter(Boolean).length !== 1) throw new Error(t('err.undoNotAllowed'))
  if (await remoteUrl(cwd)) {
    const pending = Number(
      (await git(cwd, ['rev-list', '--count', 'HEAD', '--not', '--remotes=origin'], { okCodes: [0, 128] })).stdout.trim()
    )
    if (!pending) throw new Error(t('err.undoPushed'))
  }
  await git(cwd, ['reset', '--soft', 'HEAD~1'])
  return (message ?? '').trim()
}
