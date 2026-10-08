import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { githubWebUrl } from '@shared/github-url'
import type { Account, BranchInfo, CommitInfo, FileChange, Project, PullRequest, RepoStatus, Snapshot } from '@shared/types'
import { useI18n } from '../i18n'
import { useGitProgress } from '../lib/useGitProgress'
import { timeAgo } from '../lib/time'
import { BranchMenu } from './BranchMenu'
import { MergeBranchModal, NewBranchModal, SwitchBranchModal } from './BranchModals'
import { AmendModal, BranchFromCommitModal, TagFromCommitModal } from './CommitModals'
import { ContextMenu, type MenuItem } from './ContextMenu'
import { CreatePrModal } from './CreatePrModal'
import { DiffView } from './DiffView'
import { HistoryView } from './HistoryView'
import { ArrowDownIcon, ArrowUpIcon, PullRequestIcon, RefreshIcon, UploadIcon } from './Icons'
import { ConfirmModal } from './Modal'
import { PublishModal } from './PublishModal'
import { PullsView } from './PullsView'
import { TagsView } from './TagsView'
import { useToast } from './Toast'

interface Props {
  project: Project
  account: Account
  onState: (state: Snapshot) => void
}

type Tab = 'changes' | 'history' | 'tags' | 'pulls'

const FETCH_EVERY_MS = 5 * 60 * 1000

const splitPath = (path: string): { dir: string; file: string } => {
  const i = path.lastIndexOf('/')
  return i === -1 ? { dir: '', file: path } : { dir: path.slice(0, i + 1), file: path.slice(i + 1) }
}

/** The commit message Git users expect when a single file changed: "Update app.ts". */
function defaultSummary(file: FileChange): string {
  const name = splitPath(file.path).file
  if (file.untracked || file.status === 'A') return `Create ${name}`
  if (file.status === 'D') return `Delete ${name}`
  if (file.status === 'R') return `Rename ${splitPath(file.orig ?? '').file} to ${name}`
  return `Update ${name}`
}

export function RepoView({ project, account, onState }: Props): JSX.Element {
  const { t, tr } = useI18n()
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
  const [menu, setMenu] = useState<{ x: number; y: number; file: FileChange } | null>(null)
  const [discarding, setDiscarding] = useState<FileChange[] | null>(null)
  const [amending, setAmending] = useState<{ message: string } | null>(null)
  const [branchFrom, setBranchFrom] = useState<CommitInfo | null>(null)
  const [tagFrom, setTagFrom] = useState<CommitInfo | null>(null)
  const busyRef = useRef<string | null>(null)
  const syncing = busy === 'push' || busy === 'pull' || busy === 'fetch'
  const progress = useGitProgress(id, syncing)

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
  const hasUpstream = !!status?.upstream

  // Look for new commits on GitHub in the background, so "Pull origin" appears without asking.
  useEffect(() => {
    if (!hasRemote || !hasUpstream) return
    const check = (): void => {
      if (busyRef.current) return
      window.api
        .fetch(id)
        .then(() => refresh())
        .catch(() => undefined)
    }
    check()
    const timer = setInterval(check, FETCH_EVERY_MS)
    return () => clearInterval(timer)
  }, [id, hasRemote, hasUpstream, refresh])

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

  // "Create PR" only shows when it can be used: a pushed feature branch without a pull request.
  const canPr = isGitHub && hasRemote && !!branch && !onMainBranch && hasUpstream && status?.ahead === 0 && !branchPr

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
      .catch((e: Error) => !cancelled && setDiffText(t('df.error', { reason: e.message })))
    return () => {
      cancelled = true
    }
  }, [id, selected, tab, t])

  const run = async (label: string, action: () => Promise<string | void>): Promise<void> => {
    busyRef.current = label
    setBusy(label)
    try {
      const result = await action()
      if (result) toast(result)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      busyRef.current = null
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

  const staged = files.filter((f) => f.staged)
  const stagedCount = staged.length
  // With one file in the commit, its message can be written for you.
  const summary = stagedCount === 1 ? defaultSummary(staged[0]) : null
  const canCommit = stagedCount > 0 && (message.trim().length > 0 || !!summary) && !busy

  const commit = (): Promise<void> =>
    run('commit', async () => {
      await window.api.commit(id, message.trim() || summary || '')
      setMessage('')
      return t('rp.committed')
    })

  const undo = (): Promise<void> =>
    run('undo', async () => {
      const previous = await window.api.undoCommit(id)
      setMessage((current) => current || previous)
      return t('rp.undone')
    })

  const push = (): Promise<void> =>
    run('push', async () => {
      await window.api.push(id)
      if (isGitHub && branch && !onMainBranch) {
        // The branch may already have a pull request: a new push just updates it.
        setBranchPr(await window.api.branchPull(id, upstreamBranch ?? branch).catch(() => null))
        setPrPrompt(true)
      }
      return t('rp.pushed')
    })

  const pull = (): Promise<void> =>
    run('pull', async () => {
      const result = await window.api.pull(id)
      if (result.upToDate) return t('rp.upToDate')
      return result.files ? t('rp.pulledFiles', { n: result.files }) : t('rp.pulled')
    })

  const fetchOrigin = (): Promise<void> => run('fetch', () => window.api.fetch(id))

  const dirty = files.length > 0

  const switchTo = (target: string, leaveChanges: boolean): Promise<void> =>
    run('checkout', async () => {
      await window.api.switchBranch(id, target, leaveChanges)
      if (leaveChanges) return t('rp.leftChanges')
    })

  const createBranch = (name: string, base: string | null, leaveChanges: boolean): Promise<void> =>
    run('checkout', async () => {
      await window.api.createBranch(id, name, base, leaveChanges)
      return t('rp.branchCreated', { name })
    })

  const mergeInto = (from: string): Promise<void> => run('merge', async () => window.api.mergeBranch(id, from))

  const restore = (ref: string): Promise<void> =>
    run('restore', async () => {
      await window.api.restoreChanges(id, ref)
      return t('rp.restored')
    })

  const discard = (list: FileChange[]): Promise<void> =>
    run('discard', async () => {
      await window.api.discardChanges(id, list)
      return t('rp.discarded')
    })

  const ignore = (pattern: string): Promise<void> =>
    run('ignore', async () => {
      await window.api.ignorePattern(id, pattern)
      return t('rp.ignored', { pattern })
    })

  /** The message of the commit as it was written: subject, a blank line, then the body. */
  const openAmend = async (commit: CommitInfo): Promise<void> => {
    try {
      const detail = await window.api.commitDetail(id, commit.hash)
      setAmending({ message: detail.body ? `${commit.subject}\n\n${detail.body}` : commit.subject })
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const amend = (message: string, includeStaged: boolean): Promise<void> =>
    run('amend', async () => {
      await window.api.amendCommit(id, message, includeStaged)
      return t('cm.amended')
    })

  const tagCommit = (hash: string, name: string, message: string, push: boolean): Promise<void> =>
    run('tag', async () => {
      await window.api.createTag(id, name, message, push, hash)
      return t('tg.created', { name })
    })

  const copy = (text: string): void => {
    void navigator.clipboard.writeText(text)
    toast(t('rp.pathCopied'))
  }

  /** Right-click menu of a file in the changes list. */
  const menuItems = (file: FileChange): MenuItem[] => {
    const { dir } = splitPath(file.path)
    const ext = file.path.includes('.') ? file.path.slice(file.path.lastIndexOf('.')) : ''
    // Git only ignores files it does not track yet.
    const canIgnore = file.untracked
    const folders = dir
      .split('/')
      .filter(Boolean)
      .map((_, i, parts) => parts.slice(0, i + 1).join('/'))
    const absolute = `${project.path}/${file.path}`

    const items: MenuItem[] = [
      { kind: 'item', label: t('rp.menuDiscard'), danger: true, onSelect: () => setDiscarding([file]) }
    ]
    if (files.length > 1) {
      items.push({
        kind: 'item',
        label: t('rp.menuDiscardAll', { n: files.length }),
        danger: true,
        onSelect: () => setDiscarding(files)
      })
    }
    items.push(
      { kind: 'separator' },
      {
        kind: 'item',
        label: t('rp.menuIgnoreFile'),
        disabled: !canIgnore,
        hint: t('rp.menuTracked'),
        onSelect: () => void ignore(`/${file.path}`)
      }
    )
    if (folders.length > 0) {
      items.push({ kind: 'label', label: t('rp.menuIgnoreFolder') })
      for (const folder of [...folders].reverse()) {
        items.push({
          kind: 'item',
          label: `${folder}/`,
          indent: true,
          disabled: !canIgnore,
          hint: t('rp.menuTracked'),
          onSelect: () => void ignore(`/${folder}/`)
        })
      }
    }
    if (ext) {
      items.push({
        kind: 'item',
        label: t('rp.menuIgnoreExt', { ext: `*${ext}` }),
        disabled: !canIgnore,
        hint: t('rp.menuTracked'),
        onSelect: () => void ignore(`*${ext}`)
      })
    }
    items.push(
      { kind: 'separator' },
      { kind: 'item', label: t('rp.menuCopyPath'), onSelect: () => copy(absolute) },
      { kind: 'item', label: t('rp.menuCopyRelative'), onSelect: () => copy(file.path) },
      {
        kind: 'item',
        label: t('rp.menuReveal'),
        disabled: file.status === 'D',
        onSelect: () => void window.api.revealInFinder(absolute)
      }
    )
    return items
  }

  // Main branch for "new branch from main". Falls back to a local main or master.
  const baseBranch =
    defaultBranch ||
    (branches.some((b) => b.name === 'main') ? 'main' : branches.some((b) => b.name === 'master') ? 'master' : null)

  if (!status) {
    return <div className="center-note">{loadError ?? t('rp.reading')}</div>
  }

  // The single button next to the branch: it always offers the next sensible step, like GitHub Desktop.
  const sync = (() => {
    if (!status.hasRemote) {
      return {
        icon: <UploadIcon size={18} />,
        title: t('rp.publishProject', { login: account.login }),
        sub: status.hasCommits ? t('rp.publishProjectSub') : t('rp.commitFirst'),
        count: 0,
        accent: status.hasCommits,
        disabled: !status.hasCommits,
        run: () => setPublishing(true)
      }
    }
    if (!status.upstream) {
      return {
        icon: <UploadIcon size={18} />,
        title: t('rp.publishBranch'),
        sub: t('rp.publishBranchSub'),
        count: 0,
        accent: true,
        disabled: false,
        run: () => void push()
      }
    }
    if (status.behind > 0) {
      return {
        icon: <ArrowDownIcon size={18} />,
        title: t('rp.pullOrigin'),
        sub: t('rp.pullSub', { n: status.behind }),
        count: status.behind,
        accent: true,
        disabled: false,
        run: () => void pull()
      }
    }
    if (status.ahead > 0) {
      return {
        icon: <ArrowUpIcon size={18} />,
        title: t('rp.pushOrigin'),
        sub: t('rp.pushSub', { n: status.ahead }),
        count: status.ahead,
        accent: true,
        disabled: false,
        run: () => void push()
      }
    }
    return {
      icon: <RefreshIcon size={18} />,
      title: t('rp.fetchOrigin'),
      sub: status.lastFetch ? t('rp.lastFetched', { time: timeAgo(status.lastFetch) }) : t('rp.neverFetched'),
      count: 0,
      accent: false,
      disabled: false,
      run: () => void fetchOrigin()
    }
  })()

  const busyTitle = busy === 'pull' ? t('rp.pulling') : busy === 'fetch' ? t('rp.fetching') : t('rp.pushing')
  const percent = progress?.percent ?? null
  const last = status.lastCommit

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

        <button
          className={`seg sync ${sync.accent && !syncing ? 'accent' : ''} ${syncing ? 'syncing' : ''}`}
          disabled={sync.disabled || !!busy}
          onClick={sync.run}
        >
          <span className="seg-icon">{sync.icon}</span>
          <span className="seg-text">
            <span className="seg-title">{syncing ? busyTitle : sync.title}</span>
            <span className="seg-caption">
              {syncing ? (progress ? `${progress.label}${percent !== null ? ` · ${percent}%` : ''}` : '…') : sync.sub}
            </span>
          </span>
          {sync.count > 0 && !syncing && <b className="count">{sync.count}</b>}
          {syncing && (
            <span className="sync-track">
              <span
                className={`sync-fill ${percent === null ? 'indeterminate' : ''}`}
                style={percent === null ? undefined : { width: `${percent}%` }}
              />
            </span>
          )}
        </button>

        <div className="grow" />

        {branchPr && (
          <button className="seg accent" title={branchPr.title} onClick={() => openPr(branchPr.number)}>
            <span className="seg-icon">
              <PullRequestIcon size={18} />
            </span>
            <span className="seg-text">
              <span className="seg-title">{t('rp.prNumber', { n: branchPr.number })}</span>
              <span className="seg-caption">{t('rp.prNumberSub')}</span>
            </span>
          </button>
        )}
        {canPr && (
          <button className="seg accent" onClick={() => setCreatingPr(true)}>
            <span className="seg-icon">
              <PullRequestIcon size={18} />
            </span>
            <span className="seg-text">
              <span className="seg-title">{t('rp.createPr')}</span>
              <span className="seg-caption">{t('rp.createPrSub')}</span>
            </span>
          </button>
        )}
        <button className="icon-btn toolbar-refresh" title={t('rp.refresh')} onClick={() => void refresh()}>
          <RefreshIcon size={15} />
        </button>
      </div>

      {loadError && <div className="banner">{loadError}</div>}

      {status.savedChanges && (
        <div className="banner-ok">
          <span>{tr('rp.savedChanges', { branch: status.branch ?? '' })}</span>
          <button className="btn small primary" disabled={!!busy} onClick={() => void restore(status.savedChanges!)}>
            {t('rp.restore')}
          </button>
        </div>
      )}

      {prPrompt && branchPr && (
        <div className="banner-ok">
          <span>{tr('rp.prExisting', { branch: branch ?? '', n: branchPr.number })}</span>
          <button className="btn small primary" onClick={() => openPr(branchPr.number)}>
            {t('rp.viewPr')}
          </button>
          <button className="icon-btn" aria-label={t('app.dismiss')} onClick={() => setPrPrompt(false)}>
            ×
          </button>
        </div>
      )}

      {prPrompt && !branchPr && canPr && (
        <div className="banner-ok">
          <span>{tr('rp.prOffer', { branch: branch ?? '' })}</span>
          <button className="btn small primary" onClick={() => setCreatingPr(true)}>
            {t('pr.createTitle')}
          </button>
          <button className="icon-btn" aria-label={t('app.dismiss')} onClick={() => setPrPrompt(false)}>
            ×
          </button>
        </div>
      )}

      <div className="tabs">
        <button className={tab === 'changes' ? 'on' : ''} onClick={() => setTab('changes')}>
          {t('rp.tabChanges')} {files.length > 0 && <span className="pill">{files.length}</span>}
        </button>
        <button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>
          {t('rp.tabHistory')}{' '}
          {status.unpushed > 0 && (
            <span className="pill accent" title={t('rp.pendingTitle', { n: status.unpushed })}>
              {status.unpushed}
            </span>
          )}
        </button>
        <button className={tab === 'tags' ? 'on' : ''} onClick={() => setTab('tags')}>
          {t('rp.tabTags')} {status.tagCount > 0 && <span className="pill">{status.tagCount}</span>}
        </button>
        <button className={tab === 'pulls' ? 'on' : ''} onClick={() => setTab('pulls')}>
          {t('rp.tabPulls')} {openPrs !== null && openPrs > 0 && <span className="pill">{openPrs >= 50 ? '50+' : openPrs}</span>}
        </button>
      </div>

      {tab === 'changes' && (
        <div className="split">
          <div className="files-col">
            <div className="files-head">
              <label className="check-row">
                <input type="checkbox" checked={allStaged} disabled={files.length === 0} onChange={toggleAll} />
                <span>{t('rp.changedFiles', { n: files.length })}</span>
              </label>
            </div>
            <div className="files">
              {files.length === 0 && <div className="empty-inline">{t('rp.noChanges')}</div>}
              {files.map((f) => {
                const { dir, file } = splitPath(f.path)
                return (
                  <div
                    key={f.path}
                    className={`file ${selected?.path === f.path ? 'active' : ''}`}
                    onClick={() => setSelectedPath(f.path)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setSelectedPath(f.path)
                      setMenu({ x: e.clientX, y: e.clientY, file: f })
                    }}
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
                placeholder={summary ?? t('rp.commitPlaceholder')}
                title={summary ? t('rp.commitDefaultHint') : undefined}
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canCommit) void commit()
                }}
              />
              <button className="btn primary full" disabled={!canCommit} onClick={commit}>
                {tr('rp.commitTo', { branch: status.branch ?? 'HEAD', count: stagedCount > 0 ? ` (${stagedCount})` : '' })}
              </button>
            </div>
            {last?.canUndo && (
              <div className="undo-row">
                <span className="undo-text">
                  <span className="undo-when">{t('rp.lastCommit', { time: timeAgo(last.date) })}</span>
                  <span className="undo-subject" title={last.subject}>
                    {last.subject}
                  </span>
                </span>
                <button className="btn small" disabled={!!busy} title={t('rp.undoTitle')} onClick={() => void undo()}>
                  {t('rp.undo')}
                </button>
              </div>
            )}
          </div>
          <div className="diff-col">
            {selected ? <DiffView text={diffText} /> : <div className="diff-empty">{t('rp.pickFile')}</div>}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <HistoryView
          projectId={id}
          account={account}
          refreshKey={`${status.branch}:${status.headHash}:${status.upstream}:${status.ahead}:${status.unpushed}:${status.tagCount}`}
          lastCommit={status.lastCommit}
          onUndo={() => void undo()}
          onAmend={(c) => void openAmend(c)}
          onBranch={setBranchFrom}
          onTag={setTagFrom}
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

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu.file)} onClose={() => setMenu(null)} />}

      {discarding && (
        <ConfirmModal
          danger
          title={t('rp.discardTitle')}
          body={
            discarding.length === 1
              ? tr('rp.discardOne', { name: splitPath(discarding[0].path).file })
              : t('rp.discardMany', { n: discarding.length })
          }
          confirmLabel={t('rp.discardConfirm')}
          onClose={() => setDiscarding(null)}
          onConfirm={() => {
            const list = discarding
            setDiscarding(null)
            void discard(list)
          }}
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

      {amending && (
        <AmendModal
          initialMessage={amending.message}
          stagedCount={stagedCount}
          onClose={() => setAmending(null)}
          onConfirm={(message, includeStaged) => {
            setAmending(null)
            void amend(message, includeStaged)
          }}
        />
      )}

      {branchFrom && (
        <BranchFromCommitModal
          sha={branchFrom.hash.slice(0, 7)}
          subject={branchFrom.subject}
          current={status.branch ?? 'HEAD'}
          dirty={dirty}
          onClose={() => setBranchFrom(null)}
          onConfirm={(name, leave) => {
            const commit = branchFrom
            setBranchFrom(null)
            void createBranch(name, commit.hash, leave)
          }}
        />
      )}

      {tagFrom && (
        <TagFromCommitModal
          sha={tagFrom.hash.slice(0, 7)}
          subject={tagFrom.subject}
          hasRemote={status.hasRemote}
          onClose={() => setTagFrom(null)}
          onConfirm={(name, message, push) => {
            const commit = tagFrom
            setTagFrom(null)
            void tagCommit(commit.hash, name, message, push)
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
            toast(t('rp.createdPr', { n: pr.number }))
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
