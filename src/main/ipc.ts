import { app, BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron'
import { existsSync, statSync } from 'fs'
import { randomUUID } from 'crypto'
import { basename, join, resolve, sep } from 'path'
import { githubRepoRef } from '../shared/github-url'
import type { Account, Api, MergeEmail, MergeMethod, PrDraft, Project, ReviewEvent, Snapshot } from '../shared/types'
import { API_METHODS } from '../shared/types'
import * as git from './git'
import type { Auth } from './git'
import * as github from './github'
import * as oauth from './oauth'
import { LANGS } from '../shared/i18n'
import { setLang, t } from './lang'
import { checkForUpdate } from './update'
import { deleteToken, getConfig, getToken, saveConfig, setToken } from './store'

const snapshot = (): Snapshot => {
  const { accounts, projects, activeAccount } = getConfig()
  return { accounts, projects, activeAccount }
}

const authFor = (account: Account): Auth => ({
  login: account.login,
  token: getToken(account.login),
  name: account.name || account.login,
  email: account.email
})

function accountByLogin(login: string): Account {
  const account = getConfig().accounts.find((a) => a.login === login)
  if (!account) throw new Error(t('err.noAccount', { login }))
  return account
}

/** The project and the credentials of the account it belongs to. */
function context(id: string): { project: Project; auth: Auth } {
  const project = getConfig().projects.find((p) => p.id === id)
  if (!project) throw new Error(t('err.noProject'))
  if (!existsSync(project.path)) throw new Error(t('err.noFolder', { path: project.path }))
  return { project, auth: authFor(accountByLogin(project.accountLogin)) }
}

async function addProject(path: string, accountLogin: string): Promise<void> {
  const config = getConfig()
  const duplicate = config.projects.find((p) => p.path === path)
  if (duplicate) {
    throw new Error(t('err.dupFolder', { login: duplicate.accountLogin }))
  }
  config.projects.push({
    id: randomUUID(),
    name: basename(path),
    path,
    accountLogin,
    remoteUrl: await git.remoteUrl(path)
  })
  saveConfig()
}

async function connectAccount(token: string): Promise<Snapshot> {
  const clean = token.trim()
  const user = await github.fetchUser(clean)
  const config = getConfig()
  const account: Account = {
    login: user.login,
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    email: user.email || `${user.id}+${user.login}@users.noreply.github.com`
  }
  setToken(account.login, clean)
  config.accounts = [...config.accounts.filter((a) => a.login !== account.login), account]
  config.activeAccount = account.login
  saveConfig()
  return snapshot()
}

function repoRef(project: Project): { owner: string; repo: string } {
  const ref = githubRepoRef(project.remoteUrl)
  if (!ref) throw new Error(t('err.noGithubRemote'))
  return ref
}

function checkTagName(name: string): void {
  if (!/^[A-Za-z0-9_][A-Za-z0-9_./-]*$/.test(name) || name.includes('..') || name.endsWith('/') || name.endsWith('.lock')) {
    throw new Error(t('err.tagName'))
  }
}

function checkPullNumber(n: number): number {
  if (!Number.isInteger(n) || n < 1) throw new Error(t('err.prNumber'))
  return n
}

/** "feature/add-login_page" -> "Add login page" */
function titleFromBranch(branch: string): string {
  const last = branch.split('/').pop() ?? branch
  const text = last.replace(/[-_]+/g, ' ').trim()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Runs a branch change. With leaveChanges, local changes are stashed on the current branch first,
 * and put back if the change fails. Without it, git carries the changes along.
 */
async function withChangesHandled(cwd: string, leaveChanges: boolean, change: () => Promise<void>): Promise<void> {
  const current = await git.status(cwd)
  if (!leaveChanges || current.files.length === 0 || !current.branch) {
    await change()
    return
  }
  await git.stashSave(cwd, current.branch)
  try {
    await change()
  } catch (e) {
    await git.stashPop(cwd).catch(() => undefined)
    throw e
  }
}

function requireActive(): string {
  const login = getConfig().activeAccount
  if (!login) throw new Error(t('err.connectFirst'))
  return login
}

let login: { start: oauth.DeviceStart; controller: AbortController } | null = null

const hex = /^[0-9a-f]{7,40}$/

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  /** Sends git's progress to the window, at most about 15 times a second. */
  const progressSender = (projectId: string): ((p: { phase: string; percent: number | null }) => void) => {
    let last = 0
    return (p) => {
      const now = Date.now()
      if (now - last < 60) return
      last = now
      getWindow()?.webContents.send('git:progress', { projectId, ...p })
    }
  }

  const impl: Api = {
    getState: async () => snapshot(),

    addAccount: (token) => connectAccount(token),

    async oauthAvailable() {
      return oauth.isConfigured()
    },

    async beginLogin() {
      login?.controller.abort()
      const start = await oauth.startDeviceFlow()
      login = { start, controller: new AbortController() }
      clipboard.writeText(start.userCode)
      await shell.openExternal(start.verificationUri)
      return { userCode: start.userCode, verificationUri: start.verificationUri }
    },

    async finishLogin() {
      if (!login) throw new Error(t('err.loginFirst'))
      const { start, controller } = login
      try {
        const token = await oauth.pollForToken(start, controller.signal)
        return await connectAccount(token)
      } finally {
        if (login?.controller === controller) login = null
      }
    },

    async cancelLogin() {
      login?.controller.abort()
      login = null
    },

    async removeAccount(login) {
      const config = getConfig()
      deleteToken(login)
      config.accounts = config.accounts.filter((a) => a.login !== login)
      // The folders stay on disk. Only the links to this account go away.
      config.projects = config.projects.filter((p) => p.accountLogin !== login)
      if (config.activeAccount === login) config.activeAccount = config.accounts[0]?.login ?? null
      saveConfig()
      return snapshot()
    },

    async setActiveAccount(login) {
      accountByLogin(login)
      getConfig().activeAccount = login
      saveConfig()
      return snapshot()
    },

    async chooseFolder() {
      const win = getWindow()
      const options = {
        properties: ['openDirectory', 'createDirectory'] as ('openDirectory' | 'createDirectory')[]
      }
      const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
      return result.canceled ? null : result.filePaths[0]
    },

    isGitRepo: (path) => git.isRepo(path),

    async addLocalProject(path, initRepo) {
      const login = requireActive()
      if (!statSync(path).isDirectory()) throw new Error(t('err.pickFolder'))
      if (initRepo) await git.init(path)
      else if (!(await git.isRepo(path))) throw new Error(t('err.notRepo'))
      await addProject(path, login)
      return snapshot()
    },

    async removeProject(id) {
      const config = getConfig()
      config.projects = config.projects.filter((p) => p.id !== id)
      saveConfig()
      return snapshot()
    },

    async listRepos(login) {
      return github.fetchRepos(getToken(accountByLogin(login).login))
    },

    async cloneRepo(login, cloneUrl, parentDir, name) {
      const auth = authFor(accountByLogin(login))
      const dest = join(parentDir, name)
      if (existsSync(dest)) throw new Error(t('err.destExists', { name }))
      await git.clone(parentDir, cloneUrl, name, auth, progressSender('clone'))
      await addProject(dest, login)
      return snapshot()
    },

    async publishProject(id, options) {
      const { project, auth } = context(id)
      if (await git.remoteUrl(project.path)) throw new Error(t('err.hasRemote'))
      const current = await git.status(project.path)
      if (!current.hasCommits) throw new Error(t('err.commitFirstPublish'))
      const repo = await github.createRepo(auth.token, options)
      await git.addRemote(project.path, repo.cloneUrl)
      await git.push(project.path, auth, progressSender(id))
      project.remoteUrl = repo.cloneUrl
      saveConfig()
      return snapshot()
    },

    async status(id) {
      const { project } = context(id)
      const result = await git.status(project.path)
      // Keep the saved link in sync when the remote changes outside GitDog.
      if (project.remoteUrl !== result.remoteUrl) {
        project.remoteUrl = result.remoteUrl
        saveConfig()
      }
      return result
    },
    diff: (id, file) => git.diff(context(id).project.path, file),
    stage: (id, paths) => git.stage(context(id).project.path, paths),
    unstage: (id, paths) => git.unstage(context(id).project.path, paths),

    async commit(id, message) {
      const { project, auth } = context(id)
      if (!message.trim()) throw new Error(t('err.commitMessage'))
      await git.commit(project.path, message.trim(), auth)
    },

    push(id) {
      const { project, auth } = context(id)
      return git.push(project.path, auth, progressSender(id))
    },

    pull(id) {
      const { project, auth } = context(id)
      return git.pull(project.path, auth, progressSender(id))
    },

    async fetch(id) {
      const { project, auth } = context(id)
      await git.fetchRemote(project.path, auth, progressSender(id))
    },

    async discardChanges(id, files) {
      const { project } = context(id)
      if (!files.length) throw new Error(t('err.noFilesToDiscard'))
      for (const file of files) {
        // Never touch anything outside the project folder.
        const inside = (p: string): boolean => {
          const full = resolve(project.path, p)
          return full === project.path || full.startsWith(`${project.path}${sep}`)
        }
        if (!inside(file.path) || (file.orig && !inside(file.orig))) throw new Error(t('err.badPattern'))
      }
      await git.discardFiles(project.path, files, (absolute) => shell.trashItem(absolute))
    },

    async ignorePattern(id, pattern) {
      git.ignorePattern(context(id).project.path, pattern)
    },

    undoCommit: (id) => git.undoLastCommit(context(id).project.path),

    async setLanguage(lang) {
      if (LANGS.includes(lang)) setLang(lang)
    },

    branches: (id) => git.branches(context(id).project.path),
    async switchBranch(id, branch, leaveChanges) {
      const { project } = context(id)
      await withChangesHandled(project.path, leaveChanges, () => git.checkout(project.path, branch, false))
    },

    async createBranch(id, name, base, leaveChanges) {
      const { project } = context(id)
      const clean = name.trim()
      if (!(await git.isValidBranchName(project.path, clean))) {
        throw new Error(t('err.branchName'))
      }
      await withChangesHandled(project.path, leaveChanges, () => git.createBranchFrom(project.path, clean, base))
    },

    async restoreChanges(id, ref) {
      const { project } = context(id)
      if (!/^stash@\{\d+\}$/.test(ref)) throw new Error(t('err.badRef'))
      await git.stashPop(project.path, ref)
    },
    async log(id) {
      const { project } = context(id)
      return git.log(project.path, !!(await git.remoteUrl(project.path)))
    },

    commitDetail(id, hash) {
      if (!hex.test(hash)) throw new Error(t('err.badCommit'))
      return git.commitDetail(context(id).project.path, hash)
    },

    commitDiff(id, hash, file) {
      if (!hex.test(hash)) throw new Error(t('err.badCommit'))
      return git.commitDiff(context(id).project.path, hash, file)
    },

    mergePreview: (id, branch) => git.mergePreview(context(id).project.path, branch),

    async mergeBranch(id, branch) {
      const { project, auth } = context(id)
      const current = await git.status(project.path)
      if (current.branch === branch) throw new Error(t('err.mergeSelf'))
      const count = await git.mergePreview(project.path, branch)
      if (count === 0) return t('msg.mergeUpToDate', { current: current.branch ?? '', branch })
      await git.mergeBranch(project.path, branch, auth)
      return t('msg.mergeBranchDone', { branch, current: current.branch ?? '', n: count })
    },

    async branchPull(id, branch) {
      const { project, auth } = context(id)
      const { owner, repo } = repoRef(project)
      return github.fetchBranchPull(auth.token, owner, repo, branch)
    },

    checkUpdate: () => checkForUpdate(app.getVersion()),

    tags(id) {
      const { project, auth } = context(id)
      return git.tags(project.path, auth)
    },

    async createTag(id, name, message, push) {
      const { project, auth } = context(id)
      checkTagName(name)
      const status = await git.status(project.path)
      if (!status.hasCommits) throw new Error(t('err.commitFirstTag'))
      await git.createTag(project.path, name, message.trim(), auth)
      if (push) {
        try {
          await git.pushTag(project.path, name, auth)
        } catch (e) {
          throw new Error(t('err.tagNotPushed', { reason: (e as Error).message }))
        }
      }
    },

    async pushTag(id, name) {
      const { project, auth } = context(id)
      checkTagName(name)
      await git.pushTag(project.path, name, auth)
    },

    async deleteTag(id, name, alsoRemote) {
      const { project, auth } = context(id)
      checkTagName(name)
      await git.deleteTag(project.path, name, alsoRemote, auth)
    },

    async listPulls(id, state) {
      const { project, auth } = context(id)
      const { owner, repo } = repoRef(project)
      return github.fetchPulls(auth.token, owner, repo, state)
    },

    async pullDetail(id, number) {
      const { project, auth } = context(id)
      const { owner, repo } = repoRef(project)
      return github.fetchPull(auth.token, owner, repo, number)
    },

    async defaultBranch(id) {
      const { project, auth } = context(id)
      const { owner, repo } = repoRef(project)
      return github.fetchDefaultBranch(auth.token, owner, repo)
    },

    async prBranches(id) {
      const { project, auth } = context(id)
      const { owner, repo } = repoRef(project)
      return github.fetchBranches(auth.token, owner, repo)
    },

    async prDraft(id, base): Promise<PrDraft> {
      const { project } = context(id)
      const [subjects, current] = await Promise.all([git.commitsAhead(project.path, base), git.status(project.path)])
      return {
        title: subjects.length === 1 ? subjects[0] : titleFromBranch(current.branch ?? ''),
        body: subjects.length > 1 ? [...subjects].reverse().map((s) => `- ${s}`).join('\n') : '',
        commits: subjects.length
      }
    },

    async createPull(id, input) {
      const { project, auth } = context(id)
      const { owner, repo } = repoRef(project)
      const current = await git.status(project.path)
      if (!current.branch) throw new Error(t('err.noBranch'))
      if (!current.upstream) throw new Error(t('err.pushBranchFirst'))
      if (!input.title.trim()) throw new Error(t('err.prTitle'))
      if (!input.base) throw new Error(t('err.prBase'))
      // The branch name on GitHub comes from the upstream, e.g. "origin/feature/x" -> "feature/x".
      const head = current.upstream.replace(/^[^/]+\//, '') || current.branch
      if (head === input.base) throw new Error(t('err.prSameBranch'))
      return github.createPull(auth.token, owner, repo, {
        title: input.title.trim(),
        body: input.body,
        base: input.base,
        draft: input.draft,
        head
      })
    },

    async pullFiles(id, number) {
      const { project, auth } = context(id)
      const { owner, repo } = repoRef(project)
      return github.fetchPullFiles(auth.token, owner, repo, checkPullNumber(number))
    },

    async pullConversation(id, number) {
      const { project, auth } = context(id)
      const { owner, repo } = repoRef(project)
      return github.fetchPullConversation(auth.token, owner, repo, checkPullNumber(number))
    },

    async reviewPull(id, number, event, body) {
      const { project, auth } = context(id)
      const { owner, repo } = repoRef(project)
      const events: ReviewEvent[] = ['APPROVE', 'COMMENT', 'REQUEST_CHANGES']
      if (!events.includes(event)) throw new Error(t('err.reviewType'))
      if (event !== 'APPROVE' && !body.trim()) throw new Error(t('err.reviewComment'))
      await github.submitReview(auth.token, owner, repo, checkPullNumber(number), event, body.trim())
    },

    async mergePull(id, number, method, deleteBranch, email) {
      const { project, auth } = context(id)
      const { owner, repo } = repoRef(project)
      const methods: MergeMethod[] = ['merge', 'squash', 'rebase']
      if (!methods.includes(method)) throw new Error(t('err.mergeMethod'))
      const n = checkPullNumber(number)

      const pr = await github.fetchPull(auth.token, owner, repo, n)
      if (pr.state !== 'open') throw new Error(t('err.prClosed'))
      if (pr.draft) throw new Error(t('err.prDraft'))

      if (email) {
        if (!/^[^\s@]+@[^\s@]+$/.test(email)) throw new Error(t('err.badEmail'))
        await github.mergePullWithEmail(auth.token, pr, method, email)
      } else {
        await github.mergePull(auth.token, owner, repo, n, method)
      }

      let note = ''
      if (deleteBranch && pr.sameRepo && pr.head !== pr.base) {
        try {
          await github.deleteBranch(auth.token, owner, repo, pr.head)
        } catch (e) {
          note = t('msg.branchDeleteFailed', { reason: (e as Error).message })
        }
      }
      return t('msg.prMerged', { n, note })
    },

    async mergeEmails(id) {
      const { project, auth } = context(id)
      const account = accountByLogin(project.accountLogin)
      const options: MergeEmail[] = [
        { email: `${account.id}+${account.login}@users.noreply.github.com`, kind: 'private' }
      ]
      let limited = false
      try {
        for (const e of await github.fetchVerifiedEmails(auth.token)) {
          if (e.email.endsWith('@users.noreply.github.com') || options.some((o) => o.email === e.email)) continue
          options.push({ email: e.email, kind: e.primary ? 'primary' : 'verified' })
        }
      } catch {
        limited = true
      }
      return { options, limited }
    },

    async openExternal(url) {
      const allowed = /^https:\/\/github\.com\//.test(url) || url.startsWith('mailto:luisfevq+gitdog@gmail.com')
      if (!allowed) throw new Error(t('err.badUrl'))
      await shell.openExternal(url)
    },

    async revealInFinder(path) {
      shell.showItemInFolder(path)
    }
  }

  for (const name of API_METHODS) {
    const fn = impl[name] as (...args: unknown[]) => unknown
    ipcMain.handle(`api:${name}`, (_event, ...args) => fn(...args))
  }
}
