import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Account, BranchInfo, FileChange, Project, PullRequest, RepoStatus, Snapshot } from '@shared/types'
import { BranchMenu } from './BranchMenu'
import { MergeBranchModal, NewBranchModal, SwitchBranchModal } from './BranchModals'
import { DiffView } from './DiffView'
import { HistoryView } from './HistoryView'
import { ProgressBar } from './ProgressBar'
import { ArrowDownIcon, ArrowUpIcon, PullRequestIcon, RefreshIcon, UploadIcon } from './Icons'
import { CreatePrModal } from './CreatePrModal'
import { PublishModal } from './PublishModal'
import { PullsView } from './PullsView'
import { TagsView } from './TagsView'
import { useGitProgress } from '../lib/useGitProgress'
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
  const [branches, setBranches] = useState<BranchInfo[]>([])
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
  const [switchTarget, setSwitchTarget] = useState<string | null>(null)
  const [creatingBranch, setCreatingBranch] = useState(false)
  const [openPrs, setOpenPrs] = useState<number | null>(null)
  const [branchPr, setBranchPr] = useState<PullRequest | null>(null)
  const [prCheck, setPrCheck] = useState(0)
  const [focus, setFocus] = useState<{ number: number; at: number } | null>(null)
  const [merging, setMerging] = useState(false)
  const progress = useGitProgress(id, busy === 'push' || busy === 'pull')

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
  // Name of this branch on GitHub, once it is published.
  const upstreamBranch = status?.upstream ? status.upstream.replace(/^[^/]+\//, '') : null

  // Is there already an open pull request for this branch?
  useEffect(() => {
    if (!isGitHub || !hasRemote || !upstreamBranch || onMainBranch) {
      setBranchPr(null)
      return
    }
    let cancelled = false
    window.api
      .branchPull(id, upstreamBranch)
      .then((pr) => !cancelled && setBranchPr(pr))
      .catch(() => !cancelled && setBranchPr(null))
    return () => {
      cancelled = true
    }
  }, [id, isGitHub, hasRemote, upstreamBranch, onMainBranch, prCheck])

  const openPr = (number: number): void => {
    setFocus({ number, at: Date.now() })
    setTab('pulls')
  }

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
    setPrCheck((n) => n + 1)
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
      if (isGitHub && branch && !onMainBranch) {
        // The branch may already have a pull request: a new push just updates it.
        setBranchPr(await window.api.branchPull(id, upstreamBranch ?? branch).catch(() => null))
        setPrPrompt(true)
      }
      return 'Push completado'
    })

  const pull = (): Promise<void> =>
    run('pull', async () => {
      const out = await window.api.pull(id)
      return out || 'Pull completado'
    })

  const dirty = files.length > 0

  const switchTo = (branch: string, leaveChanges: boolean): Promise<void> =>
    run('checkout', async () => {
      await window.api.switchBranch(id, branch, leaveChanges)
      if (leaveChanges) return 'Cambios guardados en la rama anterior'
    })

  const createBranch = (name: string, base: string | null, leaveChanges: boolean): Promise<void> =>
    run('checkout', async () => {
      await window.api.createBranch(id, name, base, leaveChanges)
      return `Rama ${name} creada`
    })

  const mergeInto = (from: string): Promise<void> =>
    run('merge', async () => window.api.mergeBranch(id, from))

  const restore = (ref: string): Promise<void> =>
    run('restore', async () => {
      await window.api.restoreChanges(id, ref)
      return 'Cambios restaurados'
    })

  // Main branch for "new branch from main". Falls back to a local main or master.
  const baseBranch =
    defaultBranch ||
    (branches.some((b) => b.name === 'main') ? 'main' : branches.some((b) => b.name === 'master') ? 'master' : null)

  if (!status) {
    return <div className="center-note">{loadError ?? 'Leyendo repositorio…'}</div>
  }

  return (
    <div className="repo">
      <div className="toolbar">
        <BranchMenu
          current={status.branch}
          branches={branches}
          baseBranch={baseBranch}
          onSwitch={(b) => (dirty ? setSwitchTarget(b) : void switchTo(b, false))}
          onCreate={() => setCreatingBranch(true)}
          onMerge={() => setMerging(true)}
        />
        <div className="grow" />
        {!status.hasRemote && status.hasCommits && (
          <button className="tool-btn accent" onClick={() => setPublishing(true)}>
            <UploadIcon size={15} /> Publicar en {account.login}
          </button>
        )}
        {showPrButton &&
          (branchPr ? (
            <button className="tool-btn accent" title={branchPr.title} onClick={() => openPr(branchPr.number)}>
              <PullRequestIcon size={15} /> PR #{branchPr.number}
            </button>
          ) : (
            <button className="tool-btn accent" disabled={!canPr} title={prHint} onClick={() => setCreatingPr(true)}>
              <PullRequestIcon size={15} /> Crear PR
            </button>
          ))}
        <button className="tool-btn" disabled={!status.upstream || !!busy} onClick={pull}>
          <ArrowDownIcon size={15} /> {busy === 'pull' ? 'Bajando…' : 'Pull'}{' '}
          {status.behind > 0 && <b className="count">{status.behind}</b>}
        </button>
        {status.hasRemote && !status.upstream ? (
          <button className="tool-btn accent" disabled={!!busy} title="Sube esta rama a GitHub" onClick={push}>
            <UploadIcon size={15} /> {busy === 'push' ? 'Subiendo…' : 'Publicar rama'}
          </button>
        ) : (
          <button
            className={`tool-btn ${status.ahead > 0 ? 'accent' : ''}`}
            disabled={!status.hasRemote || !!busy}
            onClick={push}
          >
            <ArrowUpIcon size={15} /> {busy === 'push' ? 'Subiendo…' : 'Push'}{' '}
            {status.ahead > 0 && <b className="count">{status.ahead}</b>}
          </button>
        )}
        <button className="icon-btn" title="Actualizar" onClick={() => void refresh()}>
          <RefreshIcon size={15} />
        </button>
      </div>

      {(busy === 'push' || busy === 'pull') && (
        <ProgressBar progress={progress} fallback={busy === 'push' ? 'Subiendo cambios…' : 'Descargando cambios…'} />
      )}

      {loadError && <div className="banner">{loadError}</div>}

      {status.savedChanges && (
        <div className="banner-ok">
          <span>
            Dejaste cambios guardados en <b>{status.branch}</b>.
          </span>
          <button className="btn small primary" disabled={!!busy} onClick={() => void restore(status.savedChanges!)}>
            Restaurar cambios
          </button>
        </div>
      )}

      {prPrompt && branchPr && (
        <div className="banner-ok">
          <span>
            Subiste cambios a <b>{branch}</b>. Esta rama ya tiene el pull request <b>#{branchPr.number}</b> abierto, y se
            actualizó solo.
          </span>
          <button className="btn small primary" onClick={() => openPr(branchPr.number)}>
            Ver pull request
          </button>
          <button className="icon-btn" aria-label="Cerrar aviso" onClick={() => setPrPrompt(false)}>
            ×
          </button>
        </div>
      )}

      {prPrompt && !branchPr && canPr && (
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
          Historial{' '}
          {status.unpushed > 0 && (
            <span className="pill accent" title={`${status.unpushed} ${status.unpushed === 1 ? 'commit pendiente' : 'commits pendientes'} de subir`}>
              {status.unpushed}
            </span>
          )}
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
        <HistoryView
          projectId={id}
          account={account}
          refreshKey={`${status.branch}:${status.headHash}:${status.upstream}:${status.ahead}`}
        />
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
          login={account.login}
          hasRemote={status.hasRemote}
          isGitHub={githubWebUrl(status.remoteUrl) !== null}
          onChanged={loadOpenPrs}
          initialSelected={focus?.number ?? null}
          key={focus?.at ?? 0}
        />
      )}

      {switchTarget && status.branch && (
        <SwitchBranchModal
          current={status.branch}
          target={switchTarget}
          changeCount={files.length}
          onClose={() => setSwitchTarget(null)}
          onConfirm={(leave) => {
            const target = switchTarget
            setSwitchTarget(null)
            void switchTo(target, leave)
          }}
        />
      )}

      {merging && status.branch && (
        <MergeBranchModal
          projectId={id}
          current={status.branch}
          branches={branches.filter((b) => b.name !== status.branch)}
          onClose={() => setMerging(false)}
          onConfirm={(from) => {
            setMerging(false)
            void mergeInto(from)
          }}
        />
      )}

      {creatingBranch && (
        <NewBranchModal
          current={status.branch ?? 'HEAD'}
          baseBranch={baseBranch}
          dirty={dirty}
          onClose={() => setCreatingBranch(false)}
          onConfirm={(name, base, leave) => {
            setCreatingBranch(false)
            void createBranch(name, base, leave)
          }}
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
