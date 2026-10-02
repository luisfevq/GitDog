import { useEffect, useRef, useState } from 'react'
import { BranchIcon, CheckIcon } from './Icons'

interface Props {
  current: string | null
  branches: string[]
  onCheckout: (branch: string, create: boolean) => void
}

export function BranchMenu({ current, branches, onCheckout }: Props): JSX.Element {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  const create = (): void => {
    const branch = name.trim().replace(/\s+/g, '-')
    if (!branch) return
    setOpen(false)
    setName('')
    onCheckout(branch, true)
  }

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
                  if (b !== current) onCheckout(b, false)
                }}
              >
                <span className="grow">{b}</span>
                {b === current && <CheckIcon size={14} />}
              </button>
            ))}
          </div>
          <div className="pop-sep" />
          <div className="new-branch">
            <input
              placeholder="Nueva rama…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />
            <button className="btn small" disabled={!name.trim()} onClick={create}>
              Crear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
