import { useEffect, useRef, useState } from 'react'
import type { GitProgress } from '@shared/types'
import { useI18n } from '../i18n'

/** Where each phase of git's output sits on one 0-100 bar, for pushes and for pulls and clones. */
const RANGES: Record<string, [number, number]> = {
  'Enumerating objects': [0, 5],
  'Counting objects': [5, 15],
  'Compressing objects': [15, 35],
  'Writing objects': [35, 100],
  'Receiving objects': [0, 80],
  'Resolving deltas': [80, 100],
  'Checking connectivity': [95, 100],
  'Uploading release asset': [0, 100]
}

const LABEL_KEYS = {
  'Enumerating objects': 'pg.preparing',
  'Counting objects': 'pg.counting',
  'Compressing objects': 'pg.compressing',
  'Writing objects': 'pg.writing',
  'Receiving objects': 'pg.receiving',
  'Resolving deltas': 'pg.resolving',
  'Checking connectivity': 'pg.verifying',
  'Uploading release asset': 'pg.asset'
} as const

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
  const { t } = useI18n()
  const [view, setView] = useState<ProgressView | null>(null)
  const highest = useRef(0)

  useEffect(
    () =>
      window.events.onProgress((p: GitProgress) => {
        if (p.projectId !== projectId) return
        const [from, to] = RANGES[p.phase] ?? [0, 100]
        const overall = Math.round(from + ((to - from) * (p.percent ?? 0)) / 100)
        highest.current = Math.max(highest.current, overall)
        setView({ label: p.phase in LABEL_KEYS ? t(LABEL_KEYS[p.phase as keyof typeof LABEL_KEYS]) : p.phase, percent: highest.current })
      }),
    [projectId, t]
  )

  useEffect(() => {
    if (!active) {
      highest.current = 0
      setView(null)
    }
  }, [active])

  return active ? view : null
}
