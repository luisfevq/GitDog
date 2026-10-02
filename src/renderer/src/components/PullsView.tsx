import { useCallback, useEffect, useState } from 'react'
import type { PullDetail, PullRequest, Project } from '@shared/types'
import { timeAgo } from '../lib/time'
import { BranchIcon, ExternalIcon, RefreshIcon } from './Icons'
import { useToast } from './Toast'

interface Props {
  project: Project
  hasRemote: boolean
  isGitHub: boolean
}

type Filter = 'open' | 'closed' | 'all'

const STATE_LABEL = { open: 'Abierto', closed: 'Cerrado', merged: 'Fusionado' } as const

export function PullsView({ project, hasRemote, isGitHub }: Props): JSX.Element {
  const toast = useToast()
  const id = project.id

  const [filter, setFilter] = useState<Filter>('open')
  const [pulls, setPulls] = useState<PullRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [detail, setDetail] = useState<PullDetail | null>(null)

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

  const current = pulls?.find((p) => p.number === selected) ?? pulls?.[0] ?? null
  const currentNumber = current?.number ?? null

  useEffect(() => {
    setDetail(null)
    if (currentNumber === null) return
    let cancelled = false
    window.api
      .pullDetail(id, currentNumber)
      .then((d) => !cancelled && setDetail(d))
      .catch(() => undefined) // the list data is enough to show the basics
    return () => {
      cancelled = true
    }
  }, [id, currentNumber])

  const open = (url: string): void => {
    window.api.openExternal(url).catch((e: Error) => toast(e.message, 'error'))
  }

  if (!hasRemote || !isGitHub) {
    return (
      <div className="center-note">
        {hasRemote ? 'Los pull requests solo están disponibles para proyectos de GitHub.' : 'Publica el proyecto en GitHub para ver sus pull requests.'}
      </div>
    )
  }

  const shown = detail && detail.number === currentNumber ? detail : current

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

      <div className="pr-detail">
        {!shown && <div className="diff-empty">Elige un pull request para ver el detalle.</div>}
        {shown && (
          <>
            <div className="pr-detail-head">
              <h3>
                {shown.title} <span className="pr-num">#{shown.number}</span>
              </h3>
              <button className="btn" onClick={() => open(shown.url)}>
                <ExternalIcon size={14} /> Abrir en GitHub
              </button>
            </div>
            <div className="pr-meta">
              <span className={`state-pill ${shown.draft && shown.state === 'open' ? 'draft' : shown.state}`}>
                {shown.draft && shown.state === 'open' ? 'Borrador' : STATE_LABEL[shown.state]}
              </span>
              {shown.authorAvatar && <img src={shown.authorAvatar} alt="" className="avatar small" />}
              <span>
                <b>{shown.author}</b> · {timeAgo(shown.createdAt)}
              </span>
            </div>
            <div className="pr-branches">
              <BranchIcon size={14} /> <code>{shown.head}</code> → <code>{shown.base}</code>
            </div>
            {detail && detail.number === shown.number && (
              <div className="pr-stats">
                <span className="add">+{detail.additions}</span>
                <span className="del">−{detail.deletions}</span>
                <span>{detail.changedFiles} archivos</span>
                <span>{detail.commits} commits</span>
                <span>{detail.comments} comentarios</span>
              </div>
            )}
            <div className="pr-body">{shown.body.trim() || 'Sin descripción.'}</div>
          </>
        )}
      </div>
    </div>
  )
}
