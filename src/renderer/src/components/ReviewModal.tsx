import { useState } from 'react'
import type { PullRequest, ReviewEvent } from '@shared/types'
import { Modal } from './Modal'
import { useToast } from './Toast'

interface Props {
  projectId: string
  pull: PullRequest
  /** The signed-in account wrote this PR. GitHub does not allow approving or blocking your own PR. */
  isOwn: boolean
  onClose: () => void
  onDone: () => void
}

const OPTIONS: { value: ReviewEvent; title: string; text: string }[] = [
  { value: 'COMMENT', title: 'Comentar', text: 'Deja un comentario sin aprobar ni bloquear.' },
  { value: 'APPROVE', title: 'Aprobar', text: 'Aprueba estos cambios.' },
  { value: 'REQUEST_CHANGES', title: 'Solicitar cambios', text: 'Pide cambios antes de poder hacer merge.' }
]

const DONE: Record<ReviewEvent, string> = {
  COMMENT: 'Comentario enviado',
  APPROVE: 'Pull request aprobado',
  REQUEST_CHANGES: 'Cambios solicitados'
}

export function ReviewModal({ projectId, pull, isOwn, onClose, onDone }: Props): JSX.Element {
  const toast = useToast()
  const [event, setEvent] = useState<ReviewEvent>('COMMENT')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const needsText = event !== 'APPROVE'
  const canSend = !busy && (!needsText || body.trim().length > 0)

  const send = async (): Promise<void> => {
    if (!canSend) return
    setBusy(true)
    try {
      await window.api.reviewPull(projectId, pull.number, event, body)
      toast(DONE[event])
      onDone()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`Revisar #${pull.number}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={!canSend} onClick={send}>
            {busy ? 'Enviando…' : 'Enviar revisión'}
          </button>
        </>
      }
    >
      <p className="muted">{pull.title}</p>
      <textarea
        rows={6}
        autoFocus
        placeholder={needsText ? 'Escribe tu comentario' : 'Comentario (opcional)'}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="options">
        {OPTIONS.map((o) => {
          const blocked = isOwn && o.value !== 'COMMENT'
          return (
            <label key={o.value} className={`option ${event === o.value ? 'on' : ''} ${blocked ? 'off' : ''}`}>
              <input
                type="radio"
                name="review"
                disabled={blocked}
                checked={event === o.value}
                onChange={() => setEvent(o.value)}
              />
              <span>
                <b>{o.title}</b>
                <small>{blocked ? 'GitHub no deja hacerlo en tu propio pull request.' : o.text}</small>
              </span>
            </label>
          )
        })}
      </div>
    </Modal>
  )
}
