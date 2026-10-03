import { useEffect, useRef, useState } from 'react'
import type { GitProgress } from '@shared/types'

/** Where each phase of git's output sits on one 0-100 bar, for pushes and for pulls and clones. */
const RANGES: Record<string, [number, number]> = {
  'Enumerating objects': [0, 5],
  'Counting objects': [5, 15],
  'Compressing objects': [15, 35],
  'Writing objects': [35, 100],
  'Receiving objects': [0, 80],
  'Resolving deltas': [80, 100],
  'Checking connectivity': [95, 100]
}

const LABELS: Record<string, string> = {
  'Enumerating objects': 'Preparando',
  'Counting objects': 'Contando objetos',
  'Compressing objects': 'Comprimiendo',
  'Writing objects': 'Subiendo',
  'Receiving objects': 'Descargando',
  'Resolving deltas': 'Resolviendo cambios',
  'Checking connectivity': 'Verificando'
}

export interface ProgressView {
  label: string
  /** 0-100, or null before git reports anything */
  percent: number | null
}

/**
 * Progress of the push, pull or clone of a project, while `active` is true.
 * The percent never goes backwards, because git restarts at 0 on every phase.
 */
export function useGitProgress(projectId: string, active: boolean): ProgressView | null {
  const [view, setView] = useState<ProgressView | null>(null)
  const highest = useRef(0)

  useEffect(
    () =>
      window.events.onProgress((p: GitProgress) => {
        if (p.projectId !== projectId) return
        const [from, to] = RANGES[p.phase] ?? [0, 100]
        const overall = Math.round(from + ((to - from) * (p.percent ?? 0)) / 100)
        highest.current = Math.max(highest.current, overall)
        setView({ label: LABELS[p.phase] ?? p.phase, percent: highest.current })
      }),
    [projectId]
  )

  useEffect(() => {
    if (!active) {
      highest.current = 0
      setView(null)
    }
  }, [active])

  return active ? view : null
}
