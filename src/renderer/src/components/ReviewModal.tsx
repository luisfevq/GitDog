import { useState } from 'react'
import type { PullRequest, ReviewEvent } from '@shared/types'
import { useI18n } from '../i18n'
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

const OPTIONS = [
  { value: 'COMMENT', title: 'rv.comment', text: 'rv.commentHint', done: 'rv.doneComment' },
  { value: 'APPROVE', title: 'rv.approve', text: 'rv.approveHint', done: 'rv.doneApprove' },
  { value: 'REQUEST_CHANGES', title: 'rv.request', text: 'rv.requestHint', done: 'rv.doneRequest' }
] as const satisfies readonly { value: ReviewEvent; title: string; text: string; done: string }[]

export function ReviewModal({ projectId, pull, isOwn, onClose, onDone }: Props): JSX.Element {
  const { t } = useI18n()
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
      toast(t(OPTIONS.find((o) => o.value === event)?.done ?? 'rv.doneComment'))
      onDone()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={t('rv.title', { n: pull.number })}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn primary" disabled={!canSend} onClick={send}>
            {busy ? t('rv.sending') : t('rv.send')}
          </button>
        </>
      }
    >
      <p className="muted">{pull.title}</p>
      <textarea
        rows={6}
        autoFocus
        placeholder={needsText ? t('rv.placeholderRequired') : t('rv.placeholderOptional')}
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
                <b>{t(o.title)}</b>
                <small>{blocked ? t('rv.ownBlocked') : t(o.text)}</small>
              </span>
            </label>
          )
        })}
      </div>
    </Modal>
  )
}
