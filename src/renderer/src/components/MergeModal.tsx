import { useState } from 'react'
import type { MergeMethod, PullDetail } from '@shared/types'
import { Modal } from './Modal'
import { useToast } from './Toast'

interface Props {
  projectId: string
  pull: PullDetail
  onClose: () => void
  onDone: () => void
}

const METHODS: Record<MergeMethod, { title: string; text: string }> = {
  merge: { title: 'Merge commit', text: 'Conserva todos los commits y añade un commit de merge.' },
  squash: { title: 'Squash', text: 'Junta todos los commits en uno solo.' },
  rebase: { title: 'Rebase', text: 'Reaplica los commits sobre la rama destino, sin commit de merge.' }
}

/** Plain-language reading of GitHub's mergeable_state. Null when nothing needs saying. */
function warning(pull: PullDetail): string | null {
  switch (pull.mergeableState) {
    case 'dirty':
      return 'Hay conflictos con la rama destino. Resuélvelos antes de fusionar.'
    case 'blocked':
      return 'GitHub indica reglas pendientes, por ejemplo revisiones obligatorias o checks. Si no tienes permiso, GitHub rechazará el merge.'
    case 'behind':
      return 'La rama está desactualizada respecto a la destino.'
    case 'unstable':
      return 'Hay checks que fallan.'
    default:
      return null
  }
}

export function MergeModal({ projectId, pull, onClose, onDone }: Props): JSX.Element {
  const toast = useToast()
  const [method, setMethod] = useState<MergeMethod>(pull.mergeMethods[0] ?? 'merge')
  const [deleteBranch, setDeleteBranch] = useState(false)
  const [busy, setBusy] = useState(false)

  const canDelete = pull.sameRepo && pull.head !== pull.base
  const blocked = pull.draft || pull.mergeableState === 'dirty'
  const note = pull.draft ? 'Es un borrador. Márcalo como listo en GitHub antes de fusionar.' : warning(pull)

  const merge = async (): Promise<void> => {
    if (busy || blocked) return
    setBusy(true)
    try {
      toast(await window.api.mergePull(projectId, pull.number, method, canDelete && deleteBranch))
      onDone()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`Fusionar #${pull.number}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={busy || blocked} onClick={merge}>
            {busy ? 'Fusionando…' : `Fusionar con ${METHODS[method].title}`}
          </button>
        </>
      }
    >
      <p className="muted">
        <b>{pull.head}</b> se fusionará en <b>{pull.base}</b>. Esto es visible para tu equipo y no se puede deshacer desde
        GitDog.
      </p>
      {note && <div className={blocked ? 'banner' : 'banner-warn'}>{note}</div>}

      <div className="options">
        {pull.mergeMethods.map((m) => (
          <label key={m} className={`option ${method === m ? 'on' : ''}`}>
            <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} />
            <span>
              <b>{METHODS[m].title}</b>
              <small>{METHODS[m].text}</small>
            </span>
          </label>
        ))}
      </div>

      {canDelete && (
        <label className="check-row">
          <input type="checkbox" checked={deleteBranch} onChange={(e) => setDeleteBranch(e.target.checked)} />
          <span>
            Borrar la rama <code>{pull.head}</code> en GitHub después
          </span>
        </label>
      )}
    </Modal>
  )
}
