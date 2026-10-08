import { useMemo, useState } from 'react'
import type { Project, ReleaseResult, TagInfo } from '@shared/types'
import { useI18n } from '../i18n'
import { useGitProgress } from '../lib/useGitProgress'
import { Modal } from './Modal'
import { ProgressBar } from './ProgressBar'
import { useToast } from './Toast'

interface Props {
  project: Project
  tags: TagInfo[]
  initialTag: string
  onClose: () => void
  onDone: () => void
}

const baseName = (path: string): string => path.slice(path.lastIndexOf('/') + 1)

export function ReleaseModal({ project, tags, initialTag, onClose, onDone }: Props): JSX.Element {
  const { t } = useI18n()
  const toast = useToast()

  const [tag, setTag] = useState(initialTag)
  const [title, setTitle] = useState('')
  const [titleEdited, setTitleEdited] = useState(false)
  const [notes, setNotes] = useState('')
  const [generate, setGenerate] = useState(false)
  const [draft, setDraft] = useState(false)
  const [prerelease, setPrerelease] = useState(false)
  const [files, setFiles] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ReleaseResult | null>(null)
  const progress = useGitProgress(project.id, busy)

  const cleanTag = tag.trim()
  const known = useMemo(() => tags.find((x) => x.name === cleanTag), [tags, cleanTag])
  // The title follows the tag until the user writes their own.
  const shownTitle = titleEdited ? title : cleanTag ? `${project.name} ${cleanTag.replace(/^v/i, '')}` : ''

  const addFiles = async (): Promise<void> => {
    const picked = await window.api.chooseFiles(`${project.path}/dist`)
    setFiles((current) => [...new Set([...current, ...picked])])
  }

  const create = async (): Promise<void> => {
    if (!cleanTag || busy) return
    setBusy(true)
    try {
      const done = await window.api.createRelease(project.id, {
        tag: cleanTag,
        title: shownTitle,
        notes,
        generateNotes: generate,
        draft,
        prerelease,
        files
      })
      setResult(done)
      onDone()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return (
      <Modal
        title={result.published ? t('rl.donePublished') : t('rl.doneDraft')}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose}>
              {t('common.close')}
            </button>
            <button className="btn primary" onClick={() => void window.api.openExternal(result.url)}>
              {t('app.openOnGithub')}
            </button>
          </>
        }
      >
        <p className="muted">
          {cleanTag} · {t('rl.doneFiles', { n: result.uploaded })}
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      title={t('rl.title')}
      wide
      onClose={busy ? () => undefined : onClose}
      footer={
        <>
          <button className="btn" disabled={busy} onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn primary" disabled={!cleanTag || busy} onClick={create}>
            {busy ? t('rl.working') : draft ? t('rl.saveDraft') : t('rl.publish')}
          </button>
        </>
      }
    >
      <label className="field">
        <span>{t('rl.tag')}</span>
        <input
          autoFocus
          list="release-tags"
          placeholder={t('rl.tagPlaceholder')}
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
        <datalist id="release-tags">
          {tags.map((x) => (
            <option key={x.name} value={x.name} />
          ))}
        </datalist>
      </label>
      {cleanTag && known?.onRemote === false && <p className="hint">{t('rl.tagLocal')}</p>}
      {cleanTag && !known && <p className="hint">{t('rl.tagNew')}</p>}

      <label className="field">
        <span>{t('rl.name')}</span>
        <input
          value={shownTitle}
          onChange={(e) => {
            setTitleEdited(true)
            setTitle(e.target.value)
          }}
        />
      </label>

      <label className="field">
        <span>{t('rl.notes')}</span>
        <textarea rows={6} placeholder={t('rl.notesPlaceholder')} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <label className="check-row">
        <input type="checkbox" checked={generate} onChange={(e) => setGenerate(e.target.checked)} />
        <span>{t('rl.generate')}</span>
      </label>

      <div className="field">
        <span>{t('rl.files')}</span>
        <div className="release-files">
          {files.length === 0 && <div className="empty-inline">{t('rl.noFiles')}</div>}
          {files.map((f) => (
            <div key={f} className="release-file">
              <span className="file-path" title={f}>
                {baseName(f)}
              </span>
              <button className="link-danger" disabled={busy} onClick={() => setFiles((c) => c.filter((x) => x !== f))}>
                {t('common.remove')}
              </button>
            </div>
          ))}
        </div>
        <button className="btn small" disabled={busy} onClick={() => void addFiles()}>
          {t('rl.addFiles')}
        </button>
      </div>

      <label className="check-row">
        <input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} />
        <span>{t('rl.draft')}</span>
      </label>
      <label className="check-row">
        <input type="checkbox" checked={prerelease} onChange={(e) => setPrerelease(e.target.checked)} />
        <span>{t('rl.prerelease')}</span>
      </label>

      {busy && <ProgressBar progress={progress} fallback={t('rl.working')} />}
      {!draft && <p className="hint">{t('rl.visibleHint')}</p>}
    </Modal>
  )
}
