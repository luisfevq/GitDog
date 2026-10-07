import { useEffect, useRef, useState } from 'react'
import type { BranchInfo } from '@shared/types'
import { useI18n } from '../i18n'
import { timeAgo } from '../lib/time'
import { BranchIcon, CheckIcon, ChevronDownIcon, PlusIcon } from './Icons'

interface Props {
  current: string | null
  branches: BranchInfo[]
  /** Main branch of the repo, when known */
  baseBranch: string | null
  onSwitch: (branch: string) => void
  onCreate: () => void
  onMerge: () => void
}

export function BranchMenu({ current, branches, baseBranch, onSwitch, onCreate, onMerge }: Props): JSX.Element {
  const { t, tr } = useI18n()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const q = query.trim().toLowerCase()
  const shown = branches.filter((b) => b.name.toLowerCase().includes(q))
  const close = (): void => {
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="branch" ref={ref}>
      <button className="seg" onClick={() => setOpen((o) => !o)}>
        <span className="seg-icon">
          <BranchIcon size={18} />
        </span>
        <span className="seg-text">
          <span className="seg-caption">{t('rp.currentBranch')}</span>
          <span className="seg-title">{current ?? t('br.detached')}</span>
        </span>
        <span className="seg-chevron">
          <ChevronDownIcon size={14} />
        </span>
      </button>
      {open && (
        <div className="popover branch-pop">
          <input
            className="search branch-search"
            autoFocus
            placeholder={t('br.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="branch-list">
            {shown.length === 0 && <div className="empty-inline">{t('common.noResults')}</div>}
            {shown.map((b) => (
              <button
                key={b.name}
                className="pop-item"
                onClick={() => {
                  close()
                  if (b.name !== current) onSwitch(b.name)
                }}
              >
                <span className="branch-check">{b.name === current && <CheckIcon size={14} />}</span>
                <span className="branch-name">{b.name}</span>
                {b.name === baseBranch && <span className="chip">{t('br.main')}</span>}
                <span className="branch-time">{timeAgo(b.date)}</span>
              </button>
            ))}
          </div>
          <div className="pop-sep" />
          <button
            className="pop-item"
            onClick={() => {
              close()
              onCreate()
            }}
          >
            <PlusIcon size={14} /> {t('br.new')}
          </button>
          <button
            className="pop-item"
            disabled={branches.length < 2}
            onClick={() => {
              close()
              onMerge()
            }}
          >
            <BranchIcon size={14} />
            <span>{tr('br.mergeInto', { current: current ?? 'HEAD' })}</span>
          </button>
        </div>
      )}
    </div>
  )
}
