import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Account, CommitInfo, FileChange, Project, PullRequest, RepoStatus, Snapshot } from '@shared/types'
import { BranchMenu } from './BranchMenu'
import { DiffView } from './DiffView'
import { ArrowDownIcon, ArrowUpIcon, PullRequestIcon, RefreshIcon, UploadIcon } from './Icons'
import { CreatePrModal } from './CreatePrModal'
import { PublishModal } from './PublishModal'
import { PullsView } from './PullsView'
import { TagsView } from './TagsView'
import { timeAgo } from '../lib/time'
import { githubWebUrl } from '@shared/github-url'
import { useToast } from './Toast'

interface Props {
  project: Project
  account: Account
  onState: (state: Snapshot) => void
}

type Tab = 'changes' | 'history' | 'tags' | 'pulls'

const splitPath = (path: string): { dir: string; file: string } => {
  const i = path.lastIndexOf('/')
  return i === -1 ? { dir: '', file: path } : { dir: path.slice(0, i + 1), file: path.slice(i + 1) }
}

export function RepoView({ project, account, onState }: Props): JSX.Element {
  const toast = useToast()
  const id = project.id

  const [status, setStatus] = useState<RepoStatus | null>(null)
  const [branches, setBranches] = useState<string[]>([])
  const [commits, setCommits] = useState<CommitInfo[]>([])
  const [tab, setTab] = useState<Tab>('changes')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [diffText, setDiffText] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [defaultBranch, setDefaultBranch] = useState<string | null>(null)
  const [prPrompt, setPrPrompt] = useState(false)
  const [creatingPr, setCreatingPr] = useState(false)
  const [openPrs, setOpenPrs] = useState<number | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const [s, b] = await Promise.all([window.api.status(id), window.api.branches(id)])
      setStatus(s)
      setBranches(b)
      setLoadError(null)
    } catch (e) {
      setLoadError((e as Error).message)
    }
  }, [id])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), 8000)
    const onFocus = (): void => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  // The remote changed outside GitDog: reload the saved projects so the top bar link is right.
  useEffect(() => {
    if (status && status.remoteUrl !== project.remoteUrl) {
      window.api.getState().then(onState).catch(() => undefined)
    }
  }, [status?.remoteUrl, project.remoteUrl, status, onState])

  useEffect(() => {
    if (tab !== 'history') return
    window.api
      .log(id)
      .then(setCommits)
      .catch((e: Error) => setLoadError(e.message))
  }, [tab, id, status?.hasCommits, status?.ahead])

  const isGitHub = githubWebUrl(status?.remoteUrl ?? null) !== null
  const hasRemote = status?.hasRemote ?? false

  // Name of the repo's main branch. Until it loads, main and master count as main.
  useEffect(() => {
    if (!isGitHub || !hasRemote) return
    window.api
      .defaultBranch(id)
      .then(setDefaultBranch)
      .catch(() => setDefaultBranch(''))
  }, [id, isGitHub, hasRemote])

  const branch = status?.branch ?? null
  const onMainBranch = defaultBranch ? branch === defaultBranch : branch === 'main' || branch === 'master'
  // The button shows on any feature branch. It unlocks once everything is pushed.
  const showPrButton = isGitHub && hasRemote && !!branch && !onMainBranch
  const canPr = showPrButton && !!status?.upstream && status.ahead === 0
  const prHint = !status?.upstream
    ? 'Sube la rama con Push para poder crear el pull request'
    : (status?.ahead ?? 0) > 0
      ? 'Tienes commits sin subir. Haz Push para incluirlos en el pull request'
      : 'Crear pull request'

  const loadOpenPrs = useCallback((): void => {
    if (!isGitHub || !hasRemote) {
      setOpenPrs(null)
      return
    }
    window.api
      .listPulls(id, 'open')
      .then((list) => setOpenPrs(list.length))
      .catch(() => setOpenPrs(null))
  }, [id, isGitHub, hasRemote])

  useEffect(() => {
    loadOpenPrs()
    const timer = setInterval(loadOpenPrs, 120_000)
    window.addEventListener('focus', loadOpenPrs)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', loadOpenPrs)
    }
  }, [loadOpenPrs])

  useEffect(() => setPrPrompt(false), [branch])

  const files = status?.files ?? []
  const selected = useMemo(() => files.find((f) => f.path === selectedPath) ?? files[0] ?? null, [files, selectedPath])

  useEffect(() => {
    if (!selected || tab !== 'changes') {
      setDiffText('')
      return
    }
    let cancelled = false
    window.api
      .diff(id, selected)
      .then((text) => !cancelled && setDiffText(text))
      .catch((e: Error) => !cancelled && setDiffText(`No se pudo leer el diff:\n${e.message}`))
    return () => {
      cancelled = true
    }
  }, [id, selected, tab])

  const run = async (label: string, action: () => Promise<string | void>): Promise<void> => {
    setBusy(label)
    try {
      const result = await action()
      if (result) toast(result)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(null)
      await refresh()
    }
  }

  const toggle = (file: FileChange): Promise<void> =>
    run('stage', async () => {
      await (file.staged ? window.api.unstage(id, [file.path]) : window.api.stage(id, [file.path]))
    })

  const allStaged = files.length > 0 && files.every((f) => f.staged)
  const toggleAll = (): Promise<void> =>
    run('stage', async () => {
      const paths = files.map((f) => f.path)
      await (allStaged ? window.api.unstage(id, paths) : window.api.stage(id, paths))
    })

  const stagedCount = files.filter((f) => f.staged).length
  const canCommit = stagedCount > 0 && message.trim().length > 0 && !busy

  const commit = (): Promise<void> =>
    run('commit', async () => {
      await window.api.commit(id, message)
      setMessage('')
      return 'Commit creado'
    })

  const push = (): Promise<void> =>
    run('push', async () => {
      await window.api.push(id)
      if (isGitHub && branch && !onMainBranch) setPrPrompt(true)
      return 'Push completado'
    })

  const pull = (): Promise<void> =>
    run('pull', async () => {
      const out = await window.api.pull(id)
      return out || 'Pull completado'
    })

  const checkout = (branch: string, create: boolean): Promise<void> =>
    run('checkout', async () => {
      await window.api.checkout(id, branch, create)
    })

  if (!status) {
    return <div className="center-note">{loadError ?? 'Leyendo repositorio…'}</div>
  }

  return (
    <div className="repo">
      <div className="toolbar">
        <BranchMenu current={status.branch} branches={branches} onCheckout={checkout} />
        <div className="grow" />
        {!status.hasRemote && status.hasCommits && (
          <button className="tool-btn accent" onClick={() => setPublishing(true)}>
            <UploadIcon size={15} /> Publicar en {account.login}
          </button>
        )}
        {showPrButton && (
          <button className="tool-btn accent" disabled={!canPr} title={prHint} onClick={() => setCreatingPr(true)}>
            <PullRequestIcon size={15} /> Crear PR
          </button>
        )}
        <button className="tool-btn" disabled={!status.hasRemote || !!busy} onClick={pull}>
          <ArrowDownIcon size={15} /> Pull {status.behind > 0 && <b className="count">{status.behind}</b>}
        </button>
        <button className="tool-btn" disabled={!status.hasRemote || !!busy} onClick={push}>
          <ArrowUpIcon size={15} /> Push {status.ahead > 0 && <b className="count">{status.ahead}</b>}
        </button>
        <button className="icon-btn" title="Actualizar" onClick={() => void refresh()}>
          <RefreshIcon size={15} />
        </button>
      </div>

      {loadError && <div className="banner">{loadError}</div>}

      {prPrompt && canPr && (
        <div className="banner-ok">
          <span>
            Subiste la rama <b>{branch}</b>. ¿Quieres abrir un pull request?
          </span>
          <button className="btn small primary" onClick={() => setCreatingPr(true)}>
            Crear pull request
          </button>
          <button className="icon-btn" aria-label="Cerrar aviso" onClick={() => setPrPrompt(false)}>
            ×
          </button>
        </div>
      )}

      <div className="tabs">
        <button className={tab === 'changes' ? 'on' : ''} onClick={() => setTab('changes')}>
          Cambios {files.length > 0 && <span className="pill">{files.length}</span>}
        </button>
        <button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>
          Historial
        </button>
        <button className={tab === 'tags' ? 'on' : ''} onClick={() => setTab('tags')}>
          Tags {status.tagCount > 0 && <span className="pill">{status.tagCount}</span>}
        </button>
        <button className={tab === 'pulls' ? 'on' : ''} onClick={() => setTab('pulls')}>
          Pull requests {openPrs !== null && openPrs > 0 && <span className="pill">{openPrs >= 50 ? '50+' : openPrs}</span>}
        </button>
      </div>

      {tab === 'changes' && (
        <div className="split">
          <div className="files-col">
            <div className="files-head">
              <label className="check-row">
                <input type="checkbox" checked={allStaged} disabled={files.length === 0} onChange={toggleAll} />
                <span>{files.length} {files.length === 1 ? 'archivo cambiado' : 'archivos cambiados'}</span>
              </label>
            </div>
            <div className="files">
              {files.length === 0 && <div className="empty-inline">No hay cambios. Todo está al día.</div>}
              {files.map((f) => {
                const { dir, file } = splitPath(f.path)
                return (
                  <div
                    key={f.path}
                    className={`file ${selected?.path === f.path ? 'active' : ''}`}
                    onClick={() => setSelectedPath(f.path)}
                  >
                    <input
                      type="checkbox"
                      checked={f.staged}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => void toggle(f)}
                    />
                    <span className="file-path" title={f.path}>
                      <span className="file-dir">{dir}</span>
                      {file}
                    </span>
                    <span className={`badge s-${f.status === '?' ? 'new' : f.status}`}>{f.status === '?' ? 'N' : f.status}</span>
                  </div>
                )
              })}
            </div>
            <div className="commit-box">
              <textarea
                placeholder="Mensaje del commit"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canCommit) void commit()
                }}
              />
              <button className="btn primary full" disabled={!canCommit} onClick={commit}>
                Commit en <b>{status.branch ?? 'HEAD'}</b> {stagedCount > 0 && `(${stagedCount})`}
              </button>
            </div>
          </div>
          <div className="diff-col">
            {selected ? <DiffView text={diffText} /> : <div className="diff-empty">Elige un archivo para ver los cambios.</div>}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="history">
          {commits.length === 0 && <div className="empty-inline">Aún no hay commits.</div>}
          {commits.map((c) => (
            <div key={c.hash} className="commit-row">
              <div className="commit-subject">{c.subject}</div>
              <div className="commit-meta">
                {c.author} · {timeAgo(c.date)} · <code>{c.hash.slice(0, 7)}</code>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'tags' && (
        <TagsView
          project={project}
          hasCommits={status.hasCommits}
          hasRemote={status.hasRemote}
          remoteUrl={status.remoteUrl}
          onChanged={() => void refresh()}
        />
      )}

      {tab === 'pulls' && (
        <PullsView
          project={project}
          hasRemote={status.hasRemote}
          isGitHub={githubWebUrl(status.remoteUrl) !== null}
        />
      )}

      {creatingPr && branch && (
        <CreatePrModal
          project={project}
          head={branch}
          ahead={status.ahead}
          onClose={() => setCreatingPr(false)}
          onCreated={(pr: PullRequest) => {
            setCreatingPr(false)
            setPrPrompt(false)
            setTab('pulls')
            loadOpenPrs()
            toast(`Pull request #${pr.number} creado`)
          }}
        />
      )}

      {publishing && (
        <PublishModal
          project={project}
          login={account.login}
          onClose={() => setPublishing(false)}
          onDone={(state) => {
            setPublishing(false)
            onState(state)
            void refresh()
          }}
        />
      )}
    </div>
  )
}
