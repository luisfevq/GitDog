import { basename } from 'path'
import { statSync } from 'fs'
import type { ReleaseResult } from '../shared/types'
import * as github from './github'
import { t } from './lang'

export interface RunReleaseOptions {
  token: string
  owner: string
  repo: string
  tag: string
  title: string
  notes: string
  generateNotes: boolean
  draft: boolean
  prerelease: boolean
  files: string[]
  /** Pushes the tag to GitHub first. Null when the tag is already there, or does not exist yet. */
  pushTagFirst: (() => Promise<void>) | null
  /** 0-100 over all the files together */
  onProgress: (percent: number) => void
}

/**
 * Creates a release in a way that never leaves a half-made one:
 * a draft is created, the files are uploaded to it, and only then is it published.
 * If a file fails, the draft is deleted.
 */
export async function runRelease(o: RunReleaseOptions): Promise<ReleaseResult> {
  // A published release for this tag would only fail at the very end. Say it now.
  if (await github.releaseExists(o.token, o.owner, o.repo, o.tag)) throw new Error(t('err.releaseExists', { tag: o.tag }))

  // A tag that exists only on this Mac must reach GitHub first, or GitHub would tag another commit.
  if (o.pushTagFirst) await o.pushTagFirst()

  const draft = await github.createDraftRelease(o.token, o.owner, o.repo, {
    tag: o.tag,
    name: o.title.trim() || o.tag,
    body: o.notes.trim(),
    generate: o.generateNotes,
    prerelease: o.prerelease
  })

  const sizes = o.files.map((f) => statSync(f).size)
  const total = sizes.reduce((a, b) => a + b, 0) || 1
  let done = 0
  let current = ''
  try {
    for (const [i, file] of o.files.entries()) {
      current = basename(file)
      await github.uploadAsset(o.token, draft.uploadUrl, file, (sent) => {
        o.onProgress(Math.min(100, Math.round(((done + sent) / total) * 100)))
      })
      done += sizes[i]
    }
  } catch (e) {
    await github.deleteRelease(o.token, o.owner, o.repo, draft.id).catch(() => undefined)
    throw new Error(t('err.releaseUpload', { name: current, reason: (e as Error).message }))
  }

  if (o.draft) return { url: draft.htmlUrl, published: false, uploaded: o.files.length }
  try {
    const url = await github.publishRelease(o.token, o.owner, o.repo, draft.id)
    return { url, published: true, uploaded: o.files.length }
  } catch (e) {
    throw new Error(t('err.releasePublish', { reason: (e as Error).message }))
  }
}
