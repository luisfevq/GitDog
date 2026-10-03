import { useCallback, useEffect, useState } from 'react'
import type { Project, PullRequest } from '@shared/types'
import { timeAgo } from '../lib/time'
import { PullDetailPane } from './PullDetailPane'
import { RefreshIcon } from './Icons'

interface Props {
  project: Project
  login: string
  hasRemote: boolean
  isGitHub: boolean
  /** The open PR count may have changed (review or merge). */
  onChanged: () => void
  /** Pull request to show first */
  initialSelected?: number | null
}

type Filter = 'open' | 'closed' | 'all'

export function PullsView({ project, login, hasRemote, isGitHub, onChanged, initialSelected }: Props): JSX.Element {
  const id = project.id

  const [filter, setFilter] = useState<Filter>('open')
  const [pulls, setPulls] = useState<PullRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(initialSelected ?? null)

  const load = useCallback(async (): Promise<void> => {
    setError(null)
    try {
      setPulls(await window.api.listPulls(id, filter))
    } catch (e) {
      setError((e as Error).message)
      setPulls([])
    }
  }, [id, filter])

  useEffect(() => {
    if (!hasRemote || !isGitHub) return
    setPulls(null)
    void load()
  }, [load, hasRemote, isGitHub])

  if (!hasRemote || !isGitHub) {
    return (
      <div className="center-note">
        {hasRemote
          ? 'Los pull requests solo están disponibles para proyectos de GitHub.'
          : 'Publica el proyecto en GitHub para ver sus pull requests.'}
      </div>
    )
  }

  const current = pulls?.find((p) => p.number === selected) ?? pulls?.[0] ?? null

  return (
    <div className="split">
      <div className="pr-col">
        <div className="pr-head">
          <div className="segmented">
            {(['open', 'closed', 'all'] as Filter[]).map((f) => (
              <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                {f === 'open' ? 'Abiertos' : f === 'closed' ? 'Cerrados' : 'Todos'}
              </button>
            ))}
          </div>
          <button className="icon-btn" title="Actualizar" onClick={() => void load()}>
            <RefreshIcon size={15} />
          </button>
        </div>
        {error && <div className="banner">{error}</div>}
        <div className="pr-list">
          {pulls === null && <div className="empty-inline">Cargando pull requests…</div>}
          {pulls?.length === 0 && !error && <div className="empty-inline">No hay pull requests en esta vista.</div>}
          {pulls?.map((p) => (
            <button
              key={p.number}
              className={`pr-row ${current?.number === p.number ? 'active' : ''}`}
              onClick={() => setSelected(p.number)}
            >
              <span className={`dot ${p.draft && p.state === 'open' ? 'draft' : p.state}`} />
              <span className="pr-row-main">
                <span className="pr-title">{p.title}</span>
                <span className="pr-sub">
                  #{p.number} · {p.author} · {timeAgo(p.updatedAt)}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {current ? (
        <PullDetailPane
          key={current.number}
          projectId={id}
          login={login}
          pull={current}
          onChanged={() => {
            void load()
            onChanged()
          }}
        />
      ) : (
        <div className="pr-detail">
          <div className="diff-empty">Elige un pull request para ver el detalle.</div>
        </div>
      )}
    </div>
  )
}
