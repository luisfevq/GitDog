import { BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron'
import { existsSync, statSync } from 'fs'
import { randomUUID } from 'crypto'
import { basename, join } from 'path'
import type { Account, Api, Project, Snapshot } from '../shared/types'
import { API_METHODS } from '../shared/types'
import * as git from './git'
import type { Auth } from './git'
import * as github from './github'
import * as oauth from './oauth'
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
  if (!account) throw new Error(`La cuenta ${login} no existe.`)
  return account
}

/** The project and the credentials of the account it belongs to. */
function context(id: string): { project: Project; auth: Auth } {
  const project = getConfig().projects.find((p) => p.id === id)
  if (!project) throw new Error('El proyecto ya no existe.')
  if (!existsSync(project.path)) throw new Error(`La carpeta ya no existe: ${project.path}`)
  return { project, auth: authFor(accountByLogin(project.accountLogin)) }
}

async function addProject(path: string, accountLogin: string): Promise<void> {
  const config = getConfig()
  const duplicate = config.projects.find((p) => p.path === path)
  if (duplicate) {
    throw new Error(`Esta carpeta ya está en la cuenta ${duplicate.accountLogin}.`)
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

function requireActive(): string {
  const login = getConfig().activeAccount
  if (!login) throw new Error('Primero conecta una cuenta de GitHub.')
  return login
}

let login: { start: oauth.DeviceStart; controller: AbortController } | null = null

export function registerIpc(getWindow: () => BrowserWindow | null): void {
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
      if (!login) throw new Error('Inicia el login primero.')
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
      if (!statSync(path).isDirectory()) throw new Error('Elige una carpeta.')
      if (initRepo) await git.init(path)
      else if (!(await git.isRepo(path))) throw new Error('Esta carpeta no es un repositorio Git.')
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
      if (existsSync(dest)) throw new Error(`Ya existe una carpeta llamada "${name}" en ese lugar.`)
      await git.clone(parentDir, cloneUrl, name, auth)
      await addProject(dest, login)
      return snapshot()
    },

    async publishProject(id, options) {
      const { project, auth } = context(id)
      if (await git.remoteUrl(project.path)) throw new Error('Este proyecto ya tiene un remoto.')
      const current = await git.status(project.path)
      if (!current.hasCommits) throw new Error('Haz al menos un commit antes de publicar.')
      const repo = await github.createRepo(auth.token, options)
      await git.addRemote(project.path, repo.cloneUrl)
      await git.push(project.path, auth)
      project.remoteUrl = repo.cloneUrl
      saveConfig()
      return snapshot()
    },

    status: (id) => git.status(context(id).project.path),
    diff: (id, file) => git.diff(context(id).project.path, file),
    stage: (id, paths) => git.stage(context(id).project.path, paths),
    unstage: (id, paths) => git.unstage(context(id).project.path, paths),

    async commit(id, message) {
      const { project, auth } = context(id)
      if (!message.trim()) throw new Error('Escribe un mensaje de commit.')
      await git.commit(project.path, message.trim(), auth)
    },

    push(id) {
      const { project, auth } = context(id)
      return git.push(project.path, auth)
    },

    pull(id) {
      const { project, auth } = context(id)
      return git.pull(project.path, auth)
    },

    branches: (id) => git.branches(context(id).project.path),
    checkout: (id, branch, create) => git.checkout(context(id).project.path, branch, create),
    log: (id) => git.log(context(id).project.path),

    async openExternal(url) {
      if (!/^https:\/\/github\.com\//.test(url)) throw new Error('URL no permitida.')
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
