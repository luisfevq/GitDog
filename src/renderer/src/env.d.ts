import type { Api, GitProgress } from '@shared/types'

declare global {
  interface Window {
    api: Api
    files: { pathFor(file: File): string }
    events: { onProgress(callback: (progress: GitProgress) => void): () => void }
  }
}
