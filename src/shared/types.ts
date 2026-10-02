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
  /** Stash ref (stash@{n}) of changes left on this branch with "leave my changes" */
  savedChanges: string | null
  files: FileChange[]
}

export interface CommitInfo {
  hash: string
  author: string
  date: string
  subject: string
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
  pull(id: string): Promise<string>
  branches(id: string): Promise<string[]>
  /** leaveChanges: stash local changes on the current branch first instead of carrying them over */
  switchBranch(id: string, branch: string, leaveChanges: boolean): Promise<void>
  /** base: branch to start from, or null for the current commit */
  createBranch(id: string, name: string, base: string | null, leaveChanges: boolean): Promise<void>
  restoreChanges(id: string, ref: string): Promise<void>
  log(id: string): Promise<CommitInfo[]>

  tags(id: string): Promise<TagInfo[]>
  createTag(id: string, name: string, message: string, push: boolean): Promise<void>
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
  mergePull(id: string, number: number, method: MergeMethod, deleteBranch: boolean): Promise<string>

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
  'branches',
  'switchBranch',
  'createBranch',
  'restoreChanges',
  'log',
  'tags',
  'createTag',
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
  'openExternal',
  'revealInFinder'
]
