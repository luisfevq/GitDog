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
  files: FileChange[]
}

export interface CommitInfo {
  hash: string
  author: string
  date: string
  subject: string
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
  checkout(id: string, branch: string, create: boolean): Promise<void>
  log(id: string): Promise<CommitInfo[]>

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
  'checkout',
  'log',
  'openExternal',
  'revealInFinder'
]
