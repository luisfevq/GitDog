import type { Lang } from './i18n'

export interface Account {
  login: string
  id: number
  name: string | null
  avatarUrl: string
  email: string
}

export interface Project {
  id: string
  name: string
  path: string
  accountLogin: string
  remoteUrl: string | null
}

/** Everything the UI needs to draw the workspace. Never contains tokens. */
export interface Snapshot {
  accounts: Account[]
  projects: Project[]
  activeAccount: string | null
}

export interface Repo {
  fullName: string
  name: string
  owner: string
  private: boolean
  description: string | null
  cloneUrl: string
  pushedAt: string | null
}

export interface FileChange {
  path: string
  orig?: string
  /** One letter: M, A, D, R, ?, U (conflict) */
  status: string
  staged: boolean
  untracked: boolean
}

export interface RepoStatus {
  branch: string | null
  upstream: string | null
  ahead: number
  behind: number
  hasCommits: boolean
  hasRemote: boolean
  remoteUrl: string | null
  tagCount: number
  headHash: string | null
  /** Commits of this branch that are not on GitHub yet */
  unpushed: number
  /** Last commit of the branch, for the "undo" shortcut */
  lastCommit: LastCommit | null
  /** ISO date of the last fetch or pull, from .git/FETCH_HEAD */
  lastFetch: string | null
  /** Stash ref (stash@{n}) of changes left on this branch with "leave my changes" */
  savedChanges: string | null
  files: FileChange[]
}

export interface LastCommit {
  hash: string
  subject: string
  /** ISO date */
  date: string
  /** Not pushed, not a merge, and not the first commit of the project */
  canUndo: boolean
}

export interface PullResult {
  upToDate: boolean
  /** Number of files git reported as changed, when it said so */
  files: number | null
}

export interface BranchInfo {
  name: string
  /** ISO date of the last commit */
  date: string
}

export interface CommitInfo {
  hash: string
  author: string
  email: string
  /** ISO date */
  date: string
  subject: string
  /** Branches and tags on this commit. Tags start with "tag: ". */
  refs: string[]
  /** Not on the remote yet */
  unpushed: boolean
}

export interface CommitFile {
  path: string
  orig?: string
  /** M, A, D, R, C */
  status: string
}

export interface CommitDetail {
  body: string
  files: CommitFile[]
}

/** Progress of a push, pull or clone, sent by the main process while git works. */
export interface GitProgress {
  /** Project id, or "clone" while cloning */
  projectId: string
  /** Git's own phase name, for example "Writing objects" */
  phase: string
  /** null when git did not report a percentage yet */
  percent: number | null
}

export interface UpdateInfo {
  version: string
  url: string
  name: string
}

export interface UpdateCheck {
  /** Version of this app */
  current: string
  /** A newer release, or null */
  update: UpdateInfo | null
  /** GitHub could not be reached, so "no update" does not mean "up to date" */
  failed: boolean
  /** This Mac is not Apple Silicon, and new releases only run on Apple Silicon */
  unsupported: boolean
}

export interface TagInfo {
  name: string
  hash: string
  /** ISO date */
  date: string
  subject: string
  annotated: boolean
  /** null when GitHub could not be reached */
  onRemote: boolean | null
}

export type PullState = 'open' | 'closed' | 'merged'

export interface PullRequest {
  number: number
  title: string
  state: PullState
  draft: boolean
  author: string
  authorAvatar: string
  head: string
  base: string
  url: string
  createdAt: string
  updatedAt: string
  body: string
}

export type MergeMethod = 'merge' | 'squash' | 'rebase'
export type ReviewEvent = 'APPROVE' | 'COMMENT' | 'REQUEST_CHANGES'

export interface PullDetail extends PullRequest {
  additions: number
  deletions: number
  changedFiles: number
  commits: number
  comments: number
  /** null while GitHub is still computing it */
  mergeable: boolean | null
  /** clean, blocked, behind, dirty, unstable, draft, unknown */
  mergeableState: string
  mergeMethods: MergeMethod[]
  /** Branch lives in the same repo (not a fork), so it can be deleted after merge */
  sameRepo: boolean
  /** GraphQL id and head commit, needed to merge with a chosen email */
  nodeId: string
  headSha: string
}

export interface MergeEmail {
  email: string
  kind: 'private' | 'primary' | 'verified'
}

export interface MergeEmails {
  options: MergeEmail[]
  /** The token cannot list the account's verified emails (it lacks the user:email permission) */
  limited: boolean
}

export interface PullFile {
  path: string
  previousPath?: string
  status: string
  additions: number
  deletions: number
  /** null for binary or very large files */
  patch: string | null
}

export interface PullEvent {
  id: string
  kind: 'review' | 'comment' | 'line'
  author: string
  authorAvatar: string
  /** Review state from GitHub: APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED */
  state?: string
  body: string
  /** File path for line comments */
  path?: string
  createdAt: string
}

export interface PrDraft {
  title: string
  body: string
  /** Commits of the current branch that the base branch does not have */
  commits: number
}

export interface CreatePullInput {
  title: string
  body: string
  base: string
  draft: boolean
}

export interface PublishOptions {
  name: string
  description: string
  private: boolean
}

export interface DeviceCode {
  userCode: string
  verificationUri: string
}

export interface Api {
  getState(): Promise<Snapshot>
  /** True when an OAuth Client ID is configured, so browser login can be offered. */
  oauthAvailable(): Promise<boolean>
  /** Starts browser login: opens GitHub, copies the code to the clipboard. */
  beginLogin(): Promise<DeviceCode>
  /** Resolves when the user authorizes in the browser. */
  finishLogin(): Promise<Snapshot>
  cancelLogin(): Promise<void>
  addAccount(token: string): Promise<Snapshot>
  removeAccount(login: string): Promise<Snapshot>
  setActiveAccount(login: string): Promise<Snapshot>

  chooseFolder(): Promise<string | null>
  isGitRepo(path: string): Promise<boolean>
  addLocalProject(path: string, initRepo: boolean): Promise<Snapshot>
  removeProject(id: string): Promise<Snapshot>
  listRepos(login: string): Promise<Repo[]>
  cloneRepo(login: string, cloneUrl: string, parentDir: string, name: string): Promise<Snapshot>
  publishProject(id: string, options: PublishOptions): Promise<Snapshot>

  status(id: string): Promise<RepoStatus>
  diff(id: string, file: FileChange): Promise<string>
  stage(id: string, paths: string[]): Promise<void>
  unstage(id: string, paths: string[]): Promise<void>
  commit(id: string, message: string): Promise<void>
  push(id: string): Promise<string>
  pull(id: string): Promise<PullResult>
  /** Looks for new commits on GitHub without changing any file */
  fetch(id: string): Promise<void>
  /** Sends the files to the Trash (a copy of modified ones too) and restores them from the last commit */
  discardChanges(id: string, files: FileChange[]): Promise<void>
  /** Adds a line to the project's .gitignore */
  ignorePattern(id: string, pattern: string): Promise<void>
  /** Undoes the last commit and keeps its changes. Returns the commit message. */
  undoCommit(id: string): Promise<string>
  setLanguage(lang: Lang): Promise<void>
  branches(id: string): Promise<BranchInfo[]>
  /** leaveChanges: stash local changes on the current branch first instead of carrying them over */
  switchBranch(id: string, branch: string, leaveChanges: boolean): Promise<void>
  /** base: branch to start from, or null for the current commit */
  createBranch(id: string, name: string, base: string | null, leaveChanges: boolean): Promise<void>
  restoreChanges(id: string, ref: string): Promise<void>
  log(id: string): Promise<CommitInfo[]>
  commitDetail(id: string, hash: string): Promise<CommitDetail>
  commitDiff(id: string, hash: string, file: CommitFile): Promise<string>
  /** How many commits `branch` has that the current branch does not */
  mergePreview(id: string, branch: string): Promise<number>
  mergeBranch(id: string, branch: string): Promise<string>
  /** Open pull request whose head is this branch, or null */
  branchPull(id: string, branch: string): Promise<PullRequest | null>
  checkUpdate(): Promise<UpdateCheck>

  tags(id: string): Promise<TagInfo[]>
  /** target: commit to tag, or null for the current one */
  createTag(id: string, name: string, message: string, push: boolean, target: string | null): Promise<void>
  /** Changes the message of the last commit, if it was not pushed. includeStaged also adds the staged files. */
  amendCommit(id: string, message: string, includeStaged: boolean): Promise<void>
  pushTag(id: string, name: string): Promise<void>
  deleteTag(id: string, name: string, alsoRemote: boolean): Promise<void>

  listPulls(id: string, state: 'open' | 'closed' | 'all'): Promise<PullRequest[]>
  pullDetail(id: string, number: number): Promise<PullDetail>
  defaultBranch(id: string): Promise<string>
  prBranches(id: string): Promise<string[]>
  prDraft(id: string, base: string): Promise<PrDraft>
  createPull(id: string, input: CreatePullInput): Promise<PullRequest>
  pullFiles(id: string, number: number): Promise<PullFile[]>
  pullConversation(id: string, number: number): Promise<PullEvent[]>
  reviewPull(id: string, number: number, event: ReviewEvent, body: string): Promise<void>
  /** email: address for the merge commit, or null to let GitHub use the account default */
  mergePull(id: string, number: number, method: MergeMethod, deleteBranch: boolean, email: string | null): Promise<string>
  mergeEmails(id: string): Promise<MergeEmails>

  openExternal(url: string): Promise<void>
  revealInFinder(path: string): Promise<void>
}

/** Single list of channel names. The preload script and the IPC registration both use it. */
export const API_METHODS: (keyof Api)[] = [
  'getState',
  'oauthAvailable',
  'beginLogin',
  'finishLogin',
  'cancelLogin',
  'addAccount',
  'removeAccount',
  'setActiveAccount',
  'chooseFolder',
  'isGitRepo',
  'addLocalProject',
  'removeProject',
  'listRepos',
  'cloneRepo',
  'publishProject',
  'status',
  'diff',
  'stage',
  'unstage',
  'commit',
  'push',
  'pull',
  'fetch',
  'discardChanges',
  'ignorePattern',
  'undoCommit',
  'setLanguage',
  'branches',
  'switchBranch',
  'createBranch',
  'restoreChanges',
  'log',
  'commitDetail',
  'commitDiff',
  'mergePreview',
  'mergeBranch',
  'branchPull',
  'checkUpdate',
  'tags',
  'createTag',
  'amendCommit',
  'pushTag',
  'deleteTag',
  'listPulls',
  'pullDetail',
  'defaultBranch',
  'prBranches',
  'prDraft',
  'createPull',
  'pullFiles',
  'pullConversation',
  'reviewPull',
  'mergePull',
  'mergeEmails',
  'openExternal',
  'revealInFinder'
]
