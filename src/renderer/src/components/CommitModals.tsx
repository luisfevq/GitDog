import { useState } from 'react'
import { useI18n } from '../i18n'
import { ChangesChoice } from './BranchModals'
import { Modal } from './Modal'

interface AmendProps {
  /** Message of the commit, to edit */
  initialMessage: string
  stagedCount: number
  onClose: () => void
  onConfirm: (message: string, includeStaged: boolean) => void
}

export function AmendModal({ initialMessage, stagedCount, onClose, onConfirm }: AmendProps): JSX.Element {
  const { t } = useI18n()
  const [message, setMessage] = useState(initialMessage)
  const [include, setInclude] = useState(stagedCount > 0)

  return (
    <Modal
      title={t('cm.amendTitle')}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className="btn primary"
            disabled={!message.trim()}
            onClick={() => onConfirm(message, include && stagedCount > 0)}
          >
            {t('cm.amendButton')}
          </button>
        </>
      }
    >
      <label className="field">
        <span>{t('cm.amendMessage')}</span>
        <textarea autoFocus rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      {stagedCount > 0 && (
        <label className="check-row">
          <input type="checkbox" checked={include} onChange={(e) => setInclude(e.target.checked)} />
          <span>{t('cm.amendInclude', { n: stagedCount })}</span>
        </label>
      )}
      <p className="hint">{t('cm.amendHint')}</p>
    </Modal>
  )
}

interface BranchProps {
  sha: string
  subject: string
  current: string
  dirty: boolean
  onClose: () => void
  onConfirm: (name: string, leaveChanges: boolean) => void
}

export function BranchFromCommitModal({ sha, subject, current, dirty, onClose, onConfirm }: BranchProps): JSX.Element {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [leave, setLeave] = useState(true)
  const clean = name.trim().replace(/\s+/g, '-')
  const submit = (): void => {
    if (clean) onConfirm(clean, dirty ? leave : false)
  }

  return (
    <Modal
      title={t('cm.branchTitle', { sha })}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn primary" disabled={!clean} onClick={submit}>
            {t('br.create')}
          </button>
        </>
      }
    >
      <p className="muted">{subject}</p>
      <label className="field">
        <span>{t('br.name')}</span>
        <input
          autoFocus
          placeholder={t('br.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </label>
      {dirty && (
        <>
          <p className="muted">{t('br.askChanges')}</p>
          <ChangesChoice leave={leave} setLeave={setLeave} current={current} target={clean || t('br.newBranchLabel')} />
        </>
      )}
    </Modal>
  )
}

interface TagProps {
  sha: string
  subject: string
  hasRemote: boolean
  /** The commit is not on GitHub yet */
  unpushed: boolean
  onClose: () => void
  onConfirm: (name: string, message: string, push: boolean) => void
}

export function TagFromCommitModal({ sha, subject, hasRemote, unpushed, onClose, onConfirm }: TagProps): JSX.Element {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [push, setPush] = useState(hasRemote)
  const clean = name.trim()
  const submit = (): void => {
    if (clean) onConfirm(clean, message, push && hasRemote)
  }

  return (
    <Modal
      title={t('cm.tagTitle', { sha })}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn primary" disabled={!clean} onClick={submit}>
            {t('tg.create')}
          </button>
        </>
      }
    >
      <p className="muted">{subject}</p>
      <input
        autoFocus
        placeholder={t('tg.namePlaceholder')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <input placeholder={t('tg.messagePlaceholder')} value={message} onChange={(e) => setMessage(e.target.value)} />
      <label className="check-row">
        <input type="checkbox" checked={push && hasRemote} disabled={!hasRemote} onChange={(e) => setPush(e.target.checked)} />
        <span>{t('tg.pushOnCreate')}</span>
      </label>
      {!hasRemote && <p className="hint">{t('tg.needRemote')}</p>}
      {hasRemote && unpushed && <div className="banner-warn">{t('tg.warnCommitUnpushed')}</div>}
    </Modal>
  )
}
