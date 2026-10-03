import { useEffect, useState } from 'react'
import type { BranchInfo } from '@shared/types'
import { timeAgo } from '../lib/time'
import { Modal } from './Modal'

interface ChoiceProps {
  leave: boolean
  setLeave: (leave: boolean) => void
  current: string
  target: string
}

/** What to do with local changes when the branch changes. */
function ChangesChoice({ leave, setLeave, current, target }: ChoiceProps): JSX.Element {
  return (
    <div className="options">
      <label className={`option ${leave ? 'on' : ''}`}>
        <input type="radio" name="changes" checked={leave} onChange={() => setLeave(true)} />
        <span>
          <b>
            Dejar mis cambios en <code>{current}</code>
          </b>
          <small>Se guardan aparte. Podrás restaurarlos cuando vuelvas a esa rama.</small>
        </span>
      </label>
      <label className={`option ${!leave ? 'on' : ''}`}>
        <input type="radio" name="changes" checked={!leave} onChange={() => setLeave(false)} />
        <span>
          <b>
            Llevar mis cambios a <code>{target}</code>
          </b>
          <small>Los cambios te siguen a la otra rama. Si chocan con ella, Git lo avisará.</small>
        </span>
      </label>
    </div>
  )
}

interface SwitchProps {
  current: string
  target: string
  changeCount: number
  onClose: () => void
  onConfirm: (leaveChanges: boolean) => void
}

export function SwitchBranchModal({ current, target, changeCount, onClose, onConfirm }: SwitchProps): JSX.Element {
  const [leave, setLeave] = useState(true)
  return (
    <Modal
      title={`Cambiar a ${target}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" onClick={() => onConfirm(leave)}>
            Cambiar de rama
          </button>
        </>
      }
    >
      <p className="muted">
        Tienes {changeCount} {changeCount === 1 ? 'archivo' : 'archivos'} con cambios sin commit en <b>{current}</b>. ¿Qué
        quieres hacer con ellos?
      </p>
      <ChangesChoice leave={leave} setLeave={setLeave} current={current} target={target} />
    </Modal>
  )
}

interface NewProps {
  current: string
  /** Main branch of the repo, when known */
  baseBranch: string | null
  dirty: boolean
  onClose: () => void
  onConfirm: (name: string, base: string | null, leaveChanges: boolean) => void
}

export function NewBranchModal({ current, baseBranch, dirty, onClose, onConfirm }: NewProps): JSX.Element {
  const [name, setName] = useState('')
  const [fromMain, setFromMain] = useState(false)
  const [leave, setLeave] = useState(true)

  const canPickMain = !!baseBranch && baseBranch !== current
  const useMain = canPickMain && fromMain
  // Starting from another branch moves your position, so local changes need a decision.
  const askChanges = dirty && useMain
  const clean = name.trim().replace(/\s+/g, '-')

  const submit = (): void => {
    if (clean) onConfirm(clean, useMain ? baseBranch : null, askChanges ? leave : false)
  }

  return (
    <Modal
      title="Nueva rama"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={!clean} onClick={submit}>
            Crear rama
          </button>
        </>
      }
    >
      <label className="field">
        <span>Nombre</span>
        <input
          autoFocus
          placeholder="feature/mi-cambio"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </label>

      <div className="options">
        <label className={`option ${!useMain ? 'on' : ''}`}>
          <input type="radio" name="base" checked={!useMain} onChange={() => setFromMain(false)} />
          <span>
            <b>
              Desde mi rama actual (<code>{current}</code>)
            </b>
            <small>Incluye los commits de esta rama.</small>
          </span>
        </label>
        <label className={`option ${useMain ? 'on' : ''} ${canPickMain ? '' : 'off'}`}>
          <input type="radio" name="base" disabled={!canPickMain} checked={useMain} onChange={() => setFromMain(true)} />
          <span>
            <b>
              Desde <code>{baseBranch ?? 'main'}</code>
            </b>
            <small>
              {canPickMain
                ? 'Empieza limpia, sin los commits de tu rama actual.'
                : baseBranch
                  ? 'Ya estás en esa rama.'
                  : 'No se encontró la rama principal.'}
            </small>
          </span>
        </label>
      </div>

      {dirty && !useMain && <p className="hint">Tus cambios sin commit se llevan a la nueva rama.</p>}
      {askChanges && (
        <>
          <p className="muted">Tienes cambios sin commit. ¿Qué quieres hacer con ellos?</p>
          <ChangesChoice leave={leave} setLeave={setLeave} current={current} target={clean || 'la nueva rama'} />
        </>
      )}
    </Modal>
  )
}

interface MergeProps {
  projectId: string
  current: string
  /** Branches that can be merged: every local branch except the current one */
  branches: BranchInfo[]
  onClose: () => void
  onConfirm: (branch: string) => void
}

export function MergeBranchModal({ projectId, current, branches, onClose, onConfirm }: MergeProps): JSX.Element {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    setCount(null)
    if (!picked) return
    let cancelled = false
    window.api
      .mergePreview(projectId, picked)
      .then((n) => !cancelled && setCount(n))
      .catch(() => !cancelled && setCount(null))
    return () => {
      cancelled = true
    }
  }, [projectId, picked])

  const q = query.trim().toLowerCase()
  const shown = branches.filter((b) => b.name.toLowerCase().includes(q))

  return (
    <Modal
      title={`Merge de una rama en ${current}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={!picked || !count} onClick={() => picked && onConfirm(picked)}>
            {count ? `Hacer merge de ${count} ${count === 1 ? 'commit' : 'commits'}` : 'Hacer merge'}
          </button>
        </>
      }
    >
      <input className="search" autoFocus placeholder="Buscar rama…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="repo-list short">
        {shown.length === 0 && <div className="empty-inline">Sin resultados.</div>}
        {shown.map((b) => (
          <button key={b.name} className={`repo-row ${picked === b.name ? 'active' : ''}`} onClick={() => setPicked(b.name)}>
            <span className="repo-name">{b.name}</span>
            <span className="repo-desc">Último commit {timeAgo(b.date)}</span>
          </button>
        ))}
      </div>
      {picked && count !== null && (
        <p className={count === 0 ? 'hint' : 'muted'}>
          {count === 0 ? (
            <>
              <b>{current}</b> ya tiene todo lo de <b>{picked}</b>.
            </>
          ) : (
            <>
              <b>{picked}</b> tiene {count} {count === 1 ? 'commit' : 'commits'} que <b>{current}</b> no tiene. Se hará merge en{' '}
              <b>{current}</b>.
            </>
          )}
        </p>
      )}
      <p className="hint">Si hay conflictos, el merge se cancela y tus archivos quedan como estaban.</p>
    </Modal>
  )
}
