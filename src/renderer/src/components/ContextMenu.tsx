import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export type MenuItem =
  | { kind: 'item'; label: string; onSelect: () => void; disabled?: boolean; hint?: string; danger?: boolean; indent?: boolean }
  | { kind: 'label'; label: string }
  | { kind: 'separator' }

interface Props {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

/** A right-click menu. It stays inside the window and closes on any click, scroll or Escape. */
export function ContextMenu({ x, y, items, onClose }: Props): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })

  // Move the menu back inside the window when it would open past the edge.
  useLayoutEffect(() => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    setPos({
      x: Math.max(8, Math.min(x, window.innerWidth - box.width - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - box.height - 8))
    })
  }, [x, y, items])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', onClose)
    window.addEventListener('resize', onClose)
    window.addEventListener('wheel', onClose, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', onClose)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('wheel', onClose)
    }
  }, [onClose])

  return (
    <div className="ctx-overlay" onMouseDown={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }}>
      <div ref={ref} className="ctx-menu" style={{ left: pos.x, top: pos.y }} onMouseDown={(e) => e.stopPropagation()}>
        {items.map((item, i) => {
          if (item.kind === 'separator') return <div key={i} className="ctx-sep" />
          if (item.kind === 'label') return <div key={i} className="ctx-label">{item.label}</div>
          return (
            <button
              key={i}
              className={`ctx-item ${item.danger ? 'danger' : ''} ${item.indent ? 'indent' : ''}`}
              disabled={item.disabled}
              title={item.disabled ? item.hint : undefined}
              onClick={() => {
                onClose()
                item.onSelect()
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
