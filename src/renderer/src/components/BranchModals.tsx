import { useEffect, useState } from 'react'
import type { BranchInfo } from '@shared/types'
import { useI18n } from '../i18n'
import { timeAgo } from '../lib/time'
import { Modal } from './Modal'

interface ChoiceProps {
  leave: boolean
  setLeave: (leave: boolean) => void
  current: string
  target: string
}

/** What to do with local changes when the branch changes. */
export function ChangesChoice({ leave, setLeave, current, target }: ChoiceProps): JSX.Element {
  const { t, tr } = useI18n()
  return (
    <div className="options">
      <label className={`option ${leave ? 'on' : ''}`}>
        <input type="radio" name="changes" checked={leave} onChange={() => setLeave(true)} />
        <span>
          <b>{tr('br.leave', { current })}</b>
          <small>{t('br.leaveHint')}</small>
        </span>
      </label>
      <label className={`option ${!leave ? 'on' : ''}`}>
        <input type="radio" name="changes" checked={!leave} onChange={() => setLeave(false)} />
        <span>
          <b>{tr('br.carry', { target })}</b>
          <small>{t('br.carryHint')}</small>
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
  const { t, tr } = useI18n()
  const [leave, setLeave] = useState(true)
  return (
    <Modal
      title={t('br.switchTitle', { target })}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn primary" onClick={() => onConfirm(leave)}>
            {t('br.switchButton')}
          </button>
        </>
      }
    >
      <p className="muted">{tr('br.switchBody', { n: changeCount, current })}</p>
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
  const { t, tr } = useI18n()
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
      title={t('br.newTitle')}
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

      <div className="options">
        <label className={`option ${!useMain ? 'on' : ''}`}>
          <input type="radio" name="base" checked={!useMain} onChange={() => setFromMain(false)} />
          <span>
            <b>{tr('br.fromCurrent', { current })}</b>
            <small>{t('br.fromCurrentHint')}</small>
          </span>
        </label>
        <label className={`option ${useMain ? 'on' : ''} ${canPickMain ? '' : 'off'}`}>
          <input type="radio" name="base" disabled={!canPickMain} checked={useMain} onChange={() => setFromMain(true)} />
          <span>
            <b>{tr('br.fromBase', { base: baseBranch ?? 'main' })}</b>
            <small>{canPickMain ? t('br.fromBaseHint') : baseBranch ? t('br.alreadyThere') : t('br.noBase')}</small>
          </span>
        </label>
      </div>

      {dirty && !useMain && <p className="hint">{t('br.carriedHint')}</p>}
      {askChanges && (
        <>
          <p className="muted">{t('br.askChanges')}</p>
          <ChangesChoice leave={leave} setLeave={setLeave} current={current} target={clean || t('br.newBranchLabel')} />
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
  const { t, tr } = useI18n()
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
      title={t('br.mergeTitle', { current })}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn primary" disabled={!picked || !count} onClick={() => picked && onConfirm(picked)}>
            {count ? t('br.mergeButtonN', { n: count }) : t('br.mergeButton')}
          </button>
        </>
      }
    >
      <input className="search" autoFocus placeholder={t('br.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="repo-list short">
        {shown.length === 0 && <div className="empty-inline">{t('common.noResults')}</div>}
        {shown.map((b) => (
          <button key={b.name} className={`repo-row ${picked === b.name ? 'active' : ''}`} onClick={() => setPicked(b.name)}>
            <span className="repo-name">{b.name}</span>
            <span className="repo-desc">{t('br.lastCommit', { time: timeAgo(b.date) })}</span>
          </button>
        ))}
      </div>
      {picked && count !== null && (
        <p className={count === 0 ? 'hint' : 'muted'}>
          {count === 0 ? tr('br.mergeUpToDate', { current, picked }) : tr('br.mergeCount', { picked, current, n: count })}
        </p>
      )}
      <p className="hint">{t('br.mergeConflictHint')}</p>
    </Modal>
  )
}
