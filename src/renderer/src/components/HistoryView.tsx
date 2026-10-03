import { useEffect, useState } from 'react'
import type { Account, CommitDetail, CommitFile, CommitInfo } from '@shared/types'
import { timeAgo } from '../lib/time'
import { Avatar, isAccountEmail } from './Avatar'
import { DiffView } from './DiffView'
import { ArrowUpIcon } from './Icons'
import { useToast } from './Toast'

interface Props {
  projectId: string
  account: Account
  /** Changes when the history may have changed: new commit, push, branch switch */
  refreshKey: string
}

const STATUS_BADGE: Record<string, string> = { A: 'new', D: 'D', M: 'M', R: 'R', C: 'R' }

const splitPath = (path: string): { dir: string; file: string } => {
  const i = path.lastIndexOf('/')
  return i === -1 ? { dir: '', file: path } : { dir: path.slice(0, i + 1), file: path.slice(i + 1) }
}

function RefChip({ name }: { name: string }): JSX.Element {
  const tag = name.startsWith('tag: ')
  return <span className={`ref-chip ${tag ? 'tag' : ''}`}>{tag ? name.slice(5) : name}</span>
}

export function HistoryView({ projectId, account, refreshKey }: Props): JSX.Element {
  const toast = useToast()
  const [commits, setCommits] = useState<CommitInfo[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<CommitDetail | null>(null)
  const [file, setFile] = useState<CommitFile | null>(null)
  const [diff, setDiff] = useState('')

  useEffect(() => {
    let cancelled = false
    window.api
      .log(projectId)
      .then((list) => !cancelled && setCommits(list))
      .catch((e: Error) => {
        if (cancelled) return
        setCommits([])
        toast(e.message, 'error')
      })
    return () => {
      cancelled = true
    }
  }, [projectId, refreshKey, toast])

  const current = commits?.find((c) => c.hash === selected) ?? commits?.[0] ?? null
  const hash = current?.hash ?? null

  useEffect(() => {
    setDetail(null)
    setFile(null)
    if (!hash) return
    let cancelled = false
    window.api
      .commitDetail(projectId, hash)
      .then((d) => {
        if (cancelled) return
        setDetail(d)
        setFile(d.files[0] ?? null)
      })
      .catch((e: Error) => !cancelled && toast(e.message, 'error'))
    return () => {
      cancelled = true
    }
  }, [projectId, hash, toast])

  useEffect(() => {
    setDiff('')
    if (!hash || !file) return
    let cancelled = false
    window.api
      .commitDiff(projectId, hash, file)
      .then((text) => !cancelled && setDiff(text))
      .catch((e: Error) => !cancelled && setDiff(`No se pudo leer el diff:\n${e.message}`))
    return () => {
      cancelled = true
    }
  }, [projectId, hash, file])

  if (commits === null) return <div className="center-note">Leyendo historial…</div>
  if (commits.length === 0) return <div className="center-note">Aún no hay commits.</div>

  const pending = commits.filter((c) => c.unpushed).length

  // A merge made on GitHub's website uses another email, but it has the same author name as your own commits.
  const ownNames = new Set(commits.filter((c) => isAccountEmail(c.email, account)).map((c) => c.author))
  const mine = (c: CommitInfo): boolean => ownNames.has(c.author)

  return (
    <div className="split">
      <div className="commit-col">
        {commits.map((c, i) => {
          const prev = commits[i - 1]
          const header =
            c.unpushed && !prev?.unpushed
              ? `Pendiente de subir · ${pending}`
              : !c.unpushed && prev?.unpushed
                ? 'Ya en GitHub'
                : null
          return (
            <div key={c.hash}>
              {header && <div className="commit-group">{header}</div>}
              <button className={`crow ${current?.hash === c.hash ? 'active' : ''}`} onClick={() => setSelected(c.hash)}>
                <Avatar name={c.author} email={c.email} account={account} own={mine(c)} />
                <span className="crow-main">
                  <span className="crow-subject">{c.subject}</span>
                  <span className="crow-meta">
                    {c.author} · <span title={new Date(c.date).toLocaleString('es')}>{timeAgo(c.date)}</span>
                  </span>
                </span>
                <span className="crow-end">
                  {c.refs.slice(0, 1).map((r) => (
                    <RefChip key={r} name={r} />
                  ))}
                  {c.unpushed && (
                    <span className="pending" title="Pendiente de subir">
                      <ArrowUpIcon size={12} />
                    </span>
                  )}
                </span>
              </button>
            </div>
          )
        })}
      </div>

      {current && (
        <div className="commit-detail">
          <div className="commit-head">
            <h3>{current.subject}</h3>
            <div className="commit-head-meta">
              <Avatar name={current.author} email={current.email} account={account} own={mine(current)} size={20} />
              <b>{current.author}</b>
              <span>{timeAgo(current.date)}</span>
              <code>{current.hash.slice(0, 7)}</code>
              <button
                className="text-link"
                onClick={() => {
                  void navigator.clipboard.writeText(current.hash)
                  toast('Hash copiado')
                }}
              >
                Copiar
              </button>
              {current.refs.map((r) => (
                <RefChip key={r} name={r} />
              ))}
              {current.unpushed && <span className="chip warn">Pendiente de subir</span>}
            </div>
            {detail?.body && <div className="commit-body-text">{detail.body}</div>}
          </div>
          <div className="commit-files-diff">
            <div className="cfiles">
              <div className="files-head">
                {detail ? `${detail.files.length} ${detail.files.length === 1 ? 'archivo' : 'archivos'}` : 'Cargando…'}
              </div>
              {detail?.files.map((f) => {
                const { dir, file: name } = splitPath(f.path)
                return (
                  <button
                    key={f.path}
                    className={`file ${file?.path === f.path ? 'active' : ''}`}
                    onClick={() => setFile(f)}
                    title={f.path}
                  >
                    <span className="file-path">
                      <span className="file-dir">{dir}</span>
                      {name}
                    </span>
                    <span className={`badge s-${STATUS_BADGE[f.status] ?? 'M'}`}>{f.status === 'A' ? 'N' : f.status}</span>
                  </button>
                )
              })}
            </div>
            <div className="cdiff">
              {file ? <DiffView text={diff} /> : <div className="diff-empty">Este commit no cambia archivos.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
