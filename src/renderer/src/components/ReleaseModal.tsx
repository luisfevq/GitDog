import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import type { Project, ReleaseResult, TagInfo, TagTarget } from '@shared/types'
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
  const { t, tr } = useI18n()
  const toast = useToast()

  const [tag, setTag] = useState(initialTag)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [generate, setGenerate] = useState(false)
  const [draft, setDraft] = useState(false)
  const [prerelease, setPrerelease] = useState(false)
  const [files, setFiles] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ReleaseResult | null>(null)
  const [target, setTarget] = useState<TagTarget | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const progress = useGitProgress(project.id, busy)

  // Where GitHub would create a new tag: it helps to see it before publishing.
  useEffect(() => {
    window.api
      .tagTarget(project.id)
      .then(setTarget)
      .catch(() => setTarget(null))
  }, [project.id])

  const cleanTag = tag.trim()
  const known = useMemo(() => tags.find((x) => x.name === cleanTag), [tags, cleanTag])
  // A suggestion shown in grey. It is used only if the title is left empty.
  const suggestedTitle = cleanTag ? `${project.name} ${cleanTag.replace(/^v/i, '')}` : ''
  const finalTitle = title.trim() || suggestedTitle

  const addFiles = async (): Promise<void> => {
    const picked = await window.api.chooseFiles(`${project.path}/dist`)
    setFiles((current) => [...new Set([...current, ...picked])])
  }

  const addPaths = async (paths: string[]): Promise<void> => {
    if (paths.length === 0) return
    const accepted = await window.api.addDroppedFiles(paths)
    if (accepted.length < paths.length) toast(t('rl.onlyFiles'), 'error')
    setFiles((current) => [...new Set([...current, ...accepted])])
  }

  const onDrop = (e: DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current = 0
    setDragging(false)
    if (busy) return
    void addPaths([...e.dataTransfer.files].map((f) => window.files.pathFor(f)).filter(Boolean))
  }

  const create = async (): Promise<void> => {
    if (!cleanTag || busy) return
    setBusy(true)
    try {
      const done = await window.api.createRelease(project.id, {
        tag: cleanTag,
        title: finalTitle,
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
      <div
        className="release-form"
        onDragEnter={(e) => {
          e.preventDefault()
          dragDepth.current += 1
          if (!busy) setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1)
          if (dragDepth.current === 0) setDragging(false)
        }}
        onDrop={onDrop}
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
        {cleanTag && known?.onRemote === false && <p className="hint">{tr('rl.tagLocal', { hash: known.hash })}</p>}
        {cleanTag && !known && (
          <>
            <p className="hint">{tr('rl.tagNew', { default: target?.defaultBranch ?? t('rl.defaultBranch') })}</p>
            {target && target.onDefaultBranch === false && target.defaultBranch && (
              <div className="banner-warn">
                {tr('rl.warnOffDefault', { branch: target.branch ?? 'HEAD', default: target.defaultBranch })}
              </div>
            )}
            {target && target.unpushed > 0 && <div className="banner-warn">{t('rl.warnUnpushed', { n: target.unpushed })}</div>}
          </>
        )}

        <label className="field">
          <span>{t('rl.name')}</span>
          <input
            placeholder={suggestedTitle || t('rl.namePlaceholder')}
            title={suggestedTitle ? t('rl.nameDefaultHint') : undefined}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
            {files.length === 0 && <div className="empty-inline">{t('rl.dropHint')}</div>}
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

        {dragging && <div className="drop-overlay">{t('rl.drop')}</div>}
      </div>
    </Modal>
  )
}
