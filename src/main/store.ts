import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Account, Project } from '../shared/types'

/**
 * Two files on purpose:
 * - config.json  : accounts and projects. No secrets. Safe to sync between Macs later.
 * - secrets.json : tokens, encrypted with safeStorage (macOS Keychain). Stays on this Mac.
 */
export interface Config {
  version: 1
  accounts: Account[]
  projects: Project[]
  activeAccount: string | null
}

let dir = ''
let config: Config
let secrets: Record<string, string>

function readJson<T>(file: string, fallback: T): T {
  const full = join(dir, file)
  if (!existsSync(full)) return fallback
  try {
    return JSON.parse(readFileSync(full, 'utf8')) as T
  } catch {
    return fallback
  }
}

function writeJson(file: string, data: unknown, mode = 0o600): void {
  const full = join(dir, file)
  const tmp = `${full}.tmp`
  writeFileSync(tmp, JSON.stringify(data, null, 2), { mode })
  renameSync(tmp, full)
}

export function initStore(): string {
  dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  config = readJson<Config>('config.json', {
    version: 1,
    accounts: [],
    projects: [],
    activeAccount: null
  })
  secrets = readJson<Record<string, string>>('secrets.json', {})
  return dir
}

export const getConfig = (): Config => config

export function saveConfig(): void {
  writeJson('config.json', config)
}

export function setToken(login: string, token: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('El Keychain de macOS no está disponible. No se puede guardar el token.')
  }
  secrets[login] = safeStorage.encryptString(token).toString('base64')
  writeJson('secrets.json', secrets)
}

export function getToken(login: string): string {
  const encrypted = secrets[login]
  if (!encrypted) throw new Error(`No hay token para la cuenta ${login}. Vuelve a iniciar sesión.`)
  return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
}

export function deleteToken(login: string): void {
  delete secrets[login]
  writeJson('secrets.json', secrets)
}
