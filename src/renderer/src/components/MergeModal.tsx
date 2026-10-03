import { useEffect, useState } from 'react'
import type { MergeEmails, MergeMethod, PullDetail } from '@shared/types'
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
      return 'Hay conflictos con la rama destino. Resuélvelos antes de hacer merge.'
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
  const [emails, setEmails] = useState<MergeEmails | null>(null)
  // "default" lets GitHub choose. Otherwise the address of the merge commit.
  const [emailChoice, setEmailChoice] = useState<string>(() => {
    try {
      return localStorage.getItem(`gitdog.mergeEmail.${projectId}`) ?? 'private'
    } catch {
      return 'private'
    }
  })

  useEffect(() => {
    window.api
      .mergeEmails(projectId)
      .then(setEmails)
      .catch(() => setEmails({ options: [], limited: true }))
  }, [projectId])

  // The saved choice may point to an address that is gone. Fall back to the private one.
  const chosen =
    emailChoice === 'default'
      ? null
      : (emails?.options.find((o) => o.email === emailChoice || (emailChoice === 'private' && o.kind === 'private')) ?? null)
  // Rebase keeps each commit's own author, so the email only matters for merge and squash.
  const emailForMerge = method === 'rebase' || !emails ? null : (chosen?.email ?? null)

  const canDelete = pull.sameRepo && pull.head !== pull.base
  const blocked = pull.draft || pull.mergeableState === 'dirty'
  const note = pull.draft ? 'Es un borrador. Márcalo como listo en GitHub antes de hacer merge.' : warning(pull)

  const merge = async (): Promise<void> => {
    if (busy || blocked) return
    setBusy(true)
    try {
      try {
        localStorage.setItem(`gitdog.mergeEmail.${projectId}`, emailChoice)
      } catch {
        /* the choice is just not remembered */
      }
      toast(await window.api.mergePull(projectId, pull.number, method, canDelete && deleteBranch, emailForMerge))
      onDone()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`Merge del PR #${pull.number}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={busy || blocked} onClick={merge}>
            {busy ? 'Haciendo merge…' : `Hacer merge (${METHODS[method].title})`}
          </button>
        </>
      }
    >
      <p className="muted">
        Se hará merge de <b>{pull.head}</b> en <b>{pull.base}</b>. Esto es visible para tu equipo y no se puede deshacer desde
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

      {method !== 'rebase' && (
        <div className="email-choice">
          <div className="field-label">Correo del commit de merge</div>
          {!emails && <p className="hint">Buscando tus correos…</p>}
          {emails && (
            <div className="options">
              {emails.options.map((o) => {
                const on = chosen?.email === o.email
                return (
                  <label key={o.email} className={`option ${on ? 'on' : ''}`}>
                    <input type="radio" name="email" checked={on} onChange={() => setEmailChoice(o.kind === 'private' ? 'private' : o.email)} />
                    <span>
                      <b>{o.label}</b>
                      <small>{o.email}</small>
                    </span>
                  </label>
                )
              })}
              <label className={`option ${emailForMerge === null ? 'on' : ''}`}>
                <input type="radio" name="email" checked={emailForMerge === null} onChange={() => setEmailChoice('default')} />
                <span>
                  <b>El predeterminado de GitHub</b>
                  <small>GitHub usa el correo principal de tu cuenta. Puede ser el del trabajo.</small>
                </span>
              </label>
            </div>
          )}
          {emails?.limited && (
            <p className="hint">Para elegir entre más correos, el token necesita el permiso user:email.</p>
          )}
        </div>
      )}

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
