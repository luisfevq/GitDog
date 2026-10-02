import { useCallback, useEffect, useState } from 'react'
import type { Project, TagInfo } from '@shared/types'
import { githubWebUrl } from '@shared/github-url'
import { timeAgo } from '../lib/time'
import { ExternalIcon, UploadIcon } from './Icons'
import { Modal } from './Modal'
import { useToast } from './Toast'

interface Props {
  project: Project
  hasCommits: boolean
  hasRemote: boolean
  remoteUrl: string | null
  onChanged: () => void
}

export function TagsView({ project, hasCommits, hasRemote, remoteUrl, onChanged }: Props): JSX.Element {
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

  const load = useCallback(async (): Promise<void> => {
    try {
      setTags(await window.api.tags(id))
      setError(null)
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
    const done = await run(() => window.api.createTag(id, tag, message, push && hasRemote), `Tag ${tag} creado`)
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
            placeholder="Nombre del tag, por ejemplo v1.0.0"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void create()}
          />
          <button className="btn primary" disabled={!name.trim() || busy || !hasCommits} onClick={create}>
            Crear tag
          </button>
        </div>
        <input
          placeholder="Mensaje (opcional). Con mensaje se crea un tag anotado."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="tag-form-foot">
          <label className="check-row">
            <input type="checkbox" checked={push && hasRemote} disabled={!hasRemote} onChange={(e) => setPush(e.target.checked)} />
            <span>Subir a GitHub al crearlo</span>
          </label>
          <span className="hint">El tag se crea en el último commit de la rama actual.</span>
        </div>
        {!hasCommits && <p className="hint">Haz un commit antes de crear un tag.</p>}
        {hasCommits && !hasRemote && <p className="hint">Publica el proyecto para poder subir tags a GitHub.</p>}
      </div>

      {error && <div className="banner">{error}</div>}

      <div className="tag-list">
        {tags === null && <div className="empty-inline">Leyendo tags…</div>}
        {tags?.length === 0 && <div className="empty-inline">Este proyecto aún no tiene tags.</div>}
        {tags?.map((t) => (
          <div key={t.name} className="tag-row">
            <div className="tag-main">
              <div className="tag-name">
                {t.name}
                {t.onRemote === true && <span className="chip ok">En GitHub</span>}
                {t.onRemote === false && <span className="chip warn">Solo local</span>}
                {t.annotated && <span className="chip">Anotado</span>}
              </div>
              <div className="tag-meta">
                <code>{t.hash}</code> · {timeAgo(t.date)}
                {t.subject && ` · ${t.subject}`}
              </div>
            </div>
            {t.onRemote === true && web && (
              <button
                className="icon-btn"
                title="Ver release en GitHub"
                onClick={() => window.api.openExternal(`${web}/releases/tag/${encodeURIComponent(t.name)}`).catch((e: Error) => toast(e.message, 'error'))}
              >
                <ExternalIcon size={15} />
              </button>
            )}
            {t.onRemote === false && (
              <button
                className="btn small"
                disabled={busy}
                onClick={() => void run(() => window.api.pushTag(id, t.name), `Tag ${t.name} subido`)}
              >
                <UploadIcon size={13} /> Subir
              </button>
            )}
            <button
              className="link-danger"
              onClick={() => {
                setAlsoRemote(false)
                setDeleting(t)
              }}
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>

      {deleting && (
        <Modal
          title={`Eliminar el tag ${deleting.name}`}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button className="btn" onClick={() => setDeleting(null)}>
                Cancelar
              </button>
              <button
                className="btn danger"
                disabled={busy}
                onClick={async () => {
                  const tag = deleting
                  setDeleting(null)
                  await run(() => window.api.deleteTag(id, tag.name, alsoRemote && tag.onRemote === true), `Tag ${tag.name} eliminado`)
                }}
              >
                Eliminar
              </button>
            </>
          }
        >
          <p className="muted">El tag se borra de esta carpeta. Los commits no se tocan.</p>
          {deleting.onRemote === true && (
            <label className="check-row">
              <input type="checkbox" checked={alsoRemote} onChange={(e) => setAlsoRemote(e.target.checked)} />
              <span>Borrarlo también en GitHub</span>
            </label>
          )}
        </Modal>
      )}
    </div>
  )
}
