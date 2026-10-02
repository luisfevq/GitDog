import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Kind = 'info' | 'error'
interface ToastItem {
  id: number
  message: string
  kind: Kind
}

type Notify = (message: string, kind?: Kind) => void

const ToastContext = createContext<Notify>(() => undefined)
export const useToast = (): Notify => useContext(ToastContext)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [items, setItems] = useState<ToastItem[]>([])

  const notify = useCallback<Notify>((message, kind = 'info') => {
    const id = nextId++
    setItems((list) => [...list, { id, message, kind }])
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), kind === 'error' ? 8000 : 3500)
  }, [])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toasts">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
