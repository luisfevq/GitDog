import { useEffect, useRef, useState } from 'react'
import { BranchIcon, CheckIcon, PlusIcon } from './Icons'

interface Props {
  current: string | null
  branches: string[]
  onSwitch: (branch: string) => void
  onCreate: () => void
}

export function BranchMenu({ current, branches, onSwitch, onCreate }: Props): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="branch" ref={ref}>
      <button className="tool-btn" onClick={() => setOpen((o) => !o)}>
        <BranchIcon size={15} />
        <span>{current ?? 'HEAD suelto'}</span>
      </button>
      {open && (
        <div className="popover branch-pop">
          <div className="pop-label">Ramas</div>
          <div className="branch-list">
            {branches.map((b) => (
              <button
                key={b}
                className="pop-item"
                onClick={() => {
                  setOpen(false)
                  if (b !== current) onSwitch(b)
                }}
              >
                <span className="grow">{b}</span>
                {b === current && <CheckIcon size={14} />}
              </button>
            ))}
          </div>
          <div className="pop-sep" />
          <button
            className="pop-item"
            onClick={() => {
              setOpen(false)
              onCreate()
            }}
          >
            <PlusIcon size={14} /> Nueva rama…
          </button>
        </div>
      )}
    </div>
  )
}
