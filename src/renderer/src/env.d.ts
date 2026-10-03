import type { Api, GitProgress } from '@shared/types'

declare global {
  interface Window {
    api: Api
    events: { onProgress(callback: (progress: GitProgress) => void): () => void }
  }
}
