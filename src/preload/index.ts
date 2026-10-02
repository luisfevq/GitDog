import { contextBridge, ipcRenderer } from 'electron'
import { API_METHODS } from '../shared/types'
import type { Api } from '../shared/types'

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
