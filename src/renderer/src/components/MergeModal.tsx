import { useEffect, useState } from 'react'
import type { MergeEmail, MergeEmails, MergeMethod, PullDetail } from '@shared/types'
import type { MessageKey } from '@shared/messages'
import { useI18n } from '../i18n'
import { Modal } from './Modal'
import { useToast } from './Toast'

interface Props {
  projectId: string
  pull: PullDetail
  onClose: () => void
  onDone: () => void
}

const METHODS: Record<MergeMethod, { title: MessageKey; text: MessageKey }> = {
  merge: { title: 'mg.mergeCommit', text: 'mg.mergeCommitHint' },
  squash: { title: 'mg.squash', text: 'mg.squashHint' },
  rebase: { title: 'mg.rebase', text: 'mg.rebaseHint' }
}

const EMAIL_LABEL: Record<MergeEmail['kind'], MessageKey> = {
  private: 'mg.emailPrivate',
  primary: 'mg.emailPrimary',
  verified: 'mg.emailVerified'
}

/** Plain-language reading of GitHub's mergeable_state. Null when nothing needs saying. */
function warningKey(pull: PullDetail): MessageKey | null {
  switch (pull.mergeableState) {
    case 'dirty':
      return 'mg.warnDirty'
    case 'blocked':
      return 'mg.warnBlocked'
    case 'behind':
      return 'mg.warnBehind'
    case 'unstable':
      return 'mg.warnUnstable'
    default:
      return null
  }
}

export function MergeModal({ projectId, pull, onClose, onDone }: Props): JSX.Element {
  const { t, tr } = useI18n()
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
  const noteKey = pull.draft ? 'mg.warnDraft' : warningKey(pull)

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
      title={t('mg.title', { n: pull.number })}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn primary" disabled={busy || blocked} onClick={merge}>
            {busy ? t('mg.busy') : t('mg.button', { method: t(METHODS[method].title) })}
          </button>
        </>
      }
    >
      <p className="muted">{tr('mg.intro', { head: pull.head, base: pull.base })}</p>
      {noteKey && <div className={blocked ? 'banner' : 'banner-warn'}>{t(noteKey)}</div>}

      <div className="options">
        {pull.mergeMethods.map((m) => (
          <label key={m} className={`option ${method === m ? 'on' : ''}`}>
            <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} />
            <span>
              <b>{t(METHODS[m].title)}</b>
              <small>{t(METHODS[m].text)}</small>
            </span>
          </label>
        ))}
      </div>

      {method !== 'rebase' && (
        <div className="email-choice">
          <div className="field-label">{t('mg.emailTitle')}</div>
          {!emails && <p className="hint">{t('mg.emailLoading')}</p>}
          {emails && (
            <div className="options">
              {emails.options.map((o) => {
                const on = chosen?.email === o.email
                return (
                  <label key={o.email} className={`option ${on ? 'on' : ''}`}>
                    <input type="radio" name="email" checked={on} onChange={() => setEmailChoice(o.kind === 'private' ? 'private' : o.email)} />
                    <span>
                      <b>{t(EMAIL_LABEL[o.kind])}</b>
                      <small>{o.email}</small>
                    </span>
                  </label>
                )
              })}
              <label className={`option ${emailForMerge === null ? 'on' : ''}`}>
                <input type="radio" name="email" checked={emailForMerge === null} onChange={() => setEmailChoice('default')} />
                <span>
                  <b>{t('mg.emailDefault')}</b>
                  <small>{t('mg.emailDefaultHint')}</small>
                </span>
              </label>
            </div>
          )}
          {emails?.limited && <p className="hint">{t('mg.emailLimited')}</p>}
        </div>
      )}

      {canDelete && (
        <label className="check-row">
          <input type="checkbox" checked={deleteBranch} onChange={(e) => setDeleteBranch(e.target.checked)} />
          <span>{tr('mg.deleteBranch', { head: pull.head })}</span>
        </label>
      )}
    </Modal>
  )
}
