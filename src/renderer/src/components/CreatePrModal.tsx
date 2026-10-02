import { useEffect, useRef, useState } from 'react'
import type { Project, PullRequest } from '@shared/types'
import { Modal } from './Modal'
import { useToast } from './Toast'

interface Props {
  project: Project
  head: string
  /** Commits not pushed yet */
  ahead: number
  onClose: () => void
  onCreated: (pr: PullRequest) => void
}

export function CreatePrModal({ project, head, ahead, onClose, onCreated }: Props): JSX.Element {
  const toast = useToast()
  const id = project.id

  const [branches, setBranches] = useState<string[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [base, setBase] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [draft, setDraft] = useState(false)
  const [commits, setCommits] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const touched = useRef(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.defaultBranch(id), window.api.prBranches(id)])
      .then(([def, list]) => {
        if (cancelled) return
        const others = list.filter((b) => b !== head)
        setBranches(others)
        setBase(def !== head ? def : (others[0] ?? ''))
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message))
    return () => {
      cancelled = true
    }
  }, [id, head])

  useEffect(() => {
    if (!base) return
    let cancelled = false
    window.api
      .prDraft(id, base)
      .then((d) => {
        if (cancelled) return
        setCommits(d.commits)
        // Suggest a title and description until the user types their own.
        if (!touched.current) {
          setTitle(d.title)
          setBody(d.body)
        }
      })
      .catch(() => !cancelled && setCommits(null))
    return () => {
      cancelled = true
    }
  }, [id, base])

  const create = async (): Promise<void> => {
    if (!title.trim() || !base || busy) return
    setBusy(true)
    try {
      onCreated(await window.api.createPull(id, { title, body, base, draft }))
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Crear pull request"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={!title.trim() || !base || busy} onClick={create}>
            {busy ? 'Creando…' : draft ? 'Crear borrador' : 'Crear pull request'}
          </button>
        </>
      }
    >
      {loadError && <div className="banner">{loadError}</div>}

      <div className="pr-route">
        <code>{head}</code>
        <span>→</span>
        <select value={base} disabled={!branches} onChange={(e) => setBase(e.target.value)} aria-label="Rama destino">
          {!branches && <option>Cargando…</option>}
          {branches?.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      {commits !== null && base && (
        <p className="hint">
          {commits === 0
            ? `La rama ${head} no tiene commits que ${base} no tenga todavía.`
            : `${commits} ${commits === 1 ? 'commit' : 'commits'} de ${head} no están en ${base}.`}
        </p>
      )}
      {ahead > 0 && (
        <p className="hint warn-text">
          Tienes {ahead} {ahead === 1 ? 'commit' : 'commits'} sin subir. Haz Push primero para incluirlos.
        </p>
      )}

      <label className="field">
        <span>Título</span>
        <input
          autoFocus
          value={title}
          onChange={(e) => {
            touched.current = true
            setTitle(e.target.value)
          }}
        />
      </label>
      <label className="field">
        <span>Descripción (opcional)</span>
        <textarea
          rows={7}
          value={body}
          onChange={(e) => {
            touched.current = true
            setBody(e.target.value)
          }}
        />
      </label>
      <label className="check-row">
        <input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} />
        <span>Crear como borrador</span>
      </label>
    </Modal>
  )
}
