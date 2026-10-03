import { useEffect, useRef, useState } from 'react'
import type { BranchInfo } from '@shared/types'
import { timeAgo } from '../lib/time'
import { BranchIcon, CheckIcon, PlusIcon } from './Icons'

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
      <button className="tool-btn" onClick={() => setOpen((o) => !o)}>
        <BranchIcon size={15} />
        <span>{current ?? 'HEAD suelto'}</span>
      </button>
      {open && (
        <div className="popover branch-pop">
          <input
            className="search branch-search"
            autoFocus
            placeholder="Buscar rama…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="branch-list">
            {shown.length === 0 && <div className="empty-inline">Sin resultados.</div>}
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
                {b.name === baseBranch && <span className="chip">principal</span>}
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
            <PlusIcon size={14} /> Nueva rama…
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
            <span>
              Merge de otra rama en <b>{current ?? 'HEAD'}</b>…
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
