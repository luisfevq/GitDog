import { contextBridge, ipcRenderer } from 'electron'
import { API_METHODS } from '../shared/types'
import type { Api, GitProgress } from '../shared/types'

// Electron prefixes errors with "Error invoking remote method ...". Remove it so the UI shows the real message.
const clean = (error: unknown): Error =>
  new Error(String((error as Error).message).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))

const api = Object.fromEntries(
  API_METHODS.map((name) => [
    name,
    (...args: unknown[]) =>
      ipcRenderer.invoke(`api:${name}`, ...args).catch((error: unknown) => {
        throw clean(error)
      })
  ])
) as unknown as Api

contextBridge.exposeInMainWorld('api', api)

// Events pushed by the main process. Returns a function that stops listening.
contextBridge.exposeInMainWorld('events', {
  onProgress: (callback: (progress: GitProgress) => void): (() => void) => {
    const handler = (_event: unknown, progress: GitProgress): void => callback(progress)
    ipcRenderer.on('git:progress', handler)
    return () => ipcRenderer.removeListener('git:progress', handler)
  }
})
