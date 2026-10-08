import { useCallback, useEffect, useState } from 'react'
import type { Project, TagInfo, TagTarget } from '@shared/types'
import { githubWebUrl } from '@shared/github-url'
import { useI18n } from '../i18n'
import { timeAgo } from '../lib/time'
import { ExternalIcon, UploadIcon } from './Icons'
import { Modal } from './Modal'
import { ReleaseModal } from './ReleaseModal'
import { useToast } from './Toast'

interface Props {
  project: Project
  hasCommits: boolean
  hasRemote: boolean
  remoteUrl: string | null
  onChanged: () => void
}

export function TagsView({ project, hasCommits, hasRemote, remoteUrl, onChanged }: Props): JSX.Element {
  const { t, tr } = useI18n()
  const toast = useToast()
  const id = project.id
  const web = githubWebUrl(remoteUrl)

  const [tags, setTags] = useState<TagInfo[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [push, setPush] = useState(hasRemote)
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState<TagInfo | null>(null)
  const [alsoRemote, setAlsoRemote] = useState(false)
  const [releaseFor, setReleaseFor] = useState<string | null>(null)
  const [target, setTarget] = useState<TagTarget | null>(null)

  const load = useCallback(async (): Promise<void> => {
    try {
      setTags(await window.api.tags(id))
      setError(null)
      // Where a new tag would point. A failure here only hides the hint.
      window.api
        .tagTarget(id)
        .then(setTarget)
        .catch(() => setTarget(null))
    } catch (e) {
      setError((e as Error).message)
      setTags((t) => t ?? [])
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const run = async (action: () => Promise<void>, ok: string): Promise<boolean> => {
    setBusy(true)
    try {
      await action()
      toast(ok)
      return true
    } catch (e) {
      toast((e as Error).message, 'error')
      return false
    } finally {
      setBusy(false)
      await load()
      onChanged()
    }
  }

  const create = async (): Promise<void> => {
    const tag = name.trim()
    if (!tag) return
    const done = await run(() => window.api.createTag(id, tag, message, push && hasRemote, null), t('tg.created', { name: tag }))
    if (done) {
      setName('')
      setMessage('')
    }
  }

  return (
    <div className="tags-view">
      <div className="tag-form">
        <div className="tag-form-row">
          <input
            placeholder={t('tg.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void create()}
          />
          <button className="btn primary" disabled={!name.trim() || busy || !hasCommits} onClick={create}>
            {t('tg.create')}
          </button>
          {web && hasRemote && (
            <button className="btn" onClick={() => setReleaseFor('')}>
              {t('rl.button')}
            </button>
          )}
        </div>
        <input
          placeholder={t('tg.messagePlaceholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="tag-form-foot">
          <label className="check-row">
            <input type="checkbox" checked={push && hasRemote} disabled={!hasRemote} onChange={(e) => setPush(e.target.checked)} />
            <span>{t('tg.pushOnCreate')}</span>
          </label>
        </div>
        {hasCommits && target?.hash && (
          <p className="tag-target">
            {tr('tg.target', { branch: target.branch ?? 'HEAD', hash: target.hash, subject: target.subject })}
          </p>
        )}
        {hasCommits && target && target.onDefaultBranch === false && target.defaultBranch && (
          <div className="banner-warn">
            {tr('tg.warnBranch', { branch: target.branch ?? 'HEAD', default: target.defaultBranch })}
          </div>
        )}
        {hasCommits && target && target.unpushed > 0 && (
          <div className="banner-warn">{t('tg.warnUnpushed', { n: target.unpushed })}</div>
        )}
        {!hasCommits && <p className="hint">{t('tg.needCommit')}</p>}
        {hasCommits && !hasRemote && <p className="hint">{t('tg.needRemote')}</p>}
      </div>

      {error && <div className="banner">{error}</div>}

      <div className="tag-list">
        {tags === null && <div className="empty-inline">{t('tg.loading')}</div>}
        {tags?.length === 0 && <div className="empty-inline">{t('tg.empty')}</div>}
        {tags?.map((tg) => (
          <div key={tg.name} className="tag-row">
            <div className="tag-main">
              <div className="tag-name">
                {tg.name}
                {tg.onRemote === true && <span className="chip ok">{t('tg.onGithub')}</span>}
                {tg.onRemote === false && <span className="chip warn">{t('tg.localOnly')}</span>}
                {tg.annotated && <span className="chip">{t('tg.annotated')}</span>}
              </div>
              <div className="tag-meta">
                <code>{tg.hash}</code> · {timeAgo(tg.date)}
                {tg.subject && ` · ${tg.subject}`}
              </div>
            </div>
            {tg.onRemote === true && web && (
              <button
                className="icon-btn"
                title={t('tg.viewRelease')}
                onClick={() => window.api.openExternal(`${web}/releases/tag/${encodeURIComponent(tg.name)}`).catch((e: Error) => toast(e.message, 'error'))}
              >
                <ExternalIcon size={15} />
              </button>
            )}
            {tg.onRemote === false && (
              <button
                className="btn small"
                disabled={busy}
                onClick={() => void run(() => window.api.pushTag(id, tg.name), t('tg.pushed', { name: tg.name }))}
              >
                <UploadIcon size={13} /> {t('tg.push')}
              </button>
            )}
            {web && hasRemote && (
              <button className="btn small" onClick={() => setReleaseFor(tg.name)}>
                {t('rl.rowButton')}
              </button>
            )}
            <button
              className="link-danger"
              onClick={() => {
                setAlsoRemote(false)
                setDeleting(tg)
              }}
            >
              {t('tg.delete')}
            </button>
          </div>
        ))}
      </div>

      {releaseFor !== null && (
        <ReleaseModal
          project={project}
          tags={tags ?? []}
          initialTag={releaseFor}
          onClose={() => setReleaseFor(null)}
          onDone={() => {
            void load()
            onChanged()
          }}
        />
      )}

      {deleting && (
        <Modal
          title={t('tg.deleteTitle', { name: deleting.name })}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button className="btn" onClick={() => setDeleting(null)}>
                {t('common.cancel')}
              </button>
              <button
                className="btn danger"
                disabled={busy}
                onClick={async () => {
                  const tag = deleting
                  setDeleting(null)
                  await run(() => window.api.deleteTag(id, tag.name, alsoRemote && tag.onRemote === true), t('tg.deleted', { name: tag.name }))
                }}
              >
                {t('tg.delete')}
              </button>
            </>
          }
        >
          <p className="muted">{t('tg.deleteBody')}</p>
          {deleting.onRemote === true && (
            <label className="check-row">
              <input type="checkbox" checked={alsoRemote} onChange={(e) => setAlsoRemote(e.target.checked)} />
              <span>{t('tg.deleteRemote')}</span>
            </label>
          )}
        </Modal>
      )}
    </div>
  )
}
