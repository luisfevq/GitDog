import { useEffect, useState } from 'react'
import type { Account, CommitDetail, CommitFile, CommitInfo, LastCommit } from '@shared/types'
import { useI18n } from '../i18n'
import { timeAgo } from '../lib/time'
import { Avatar, isAccountEmail } from './Avatar'
import { ContextMenu, type MenuItem } from './ContextMenu'
import { DiffView } from './DiffView'
import { ArrowUpIcon } from './Icons'
import { useToast } from './Toast'

interface Props {
  projectId: string
  account: Account
  /** Changes when the history may have changed: new commit, push, branch switch */
  refreshKey: string
  /** The newest commit of the branch: only it can be amended or undone */
  lastCommit: LastCommit | null
  onUndo: () => void
  onAmend: (commit: CommitInfo) => void
  onBranch: (commit: CommitInfo) => void
  onTag: (commit: CommitInfo) => void
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

export function HistoryView({ projectId, account, refreshKey, lastCommit, onUndo, onAmend, onBranch, onTag }: Props): JSX.Element {
  const { t, lang } = useI18n()
  const toast = useToast()
  const [commits, setCommits] = useState<CommitInfo[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<CommitDetail | null>(null)
  const [file, setFile] = useState<CommitFile | null>(null)
  const [diff, setDiff] = useState('')
  const [menu, setMenu] = useState<{ x: number; y: number; commit: CommitInfo } | null>(null)

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
      .catch((e: Error) => !cancelled && setDiff(t('df.error', { reason: e.message })))
    return () => {
      cancelled = true
    }
  }, [projectId, hash, file, t])

  /** Right-click menu of a commit. Amend and undo only work on the newest commit, and only before it is pushed. */
  const menuItems = (c: CommitInfo): MenuItem[] => {
    const isHead = lastCommit?.hash === c.hash
    const canAmend = isHead && c.unpushed
    const canUndo = isHead && !!lastCommit?.canUndo
    const amendHint = !isHead ? t('cm.onlyLast') : t('cm.alreadyPushed')
    const undoHint = !isHead ? t('cm.onlyLast') : c.unpushed ? t('cm.cannotUndo') : t('cm.alreadyPushed')
    return [
      { kind: 'item', label: t('cm.amend'), disabled: !canAmend, hint: amendHint, onSelect: () => onAmend(c) },
      { kind: 'item', label: t('cm.undo'), disabled: !canUndo, hint: undoHint, onSelect: onUndo },
      { kind: 'separator' },
      { kind: 'item', label: t('cm.branch'), onSelect: () => onBranch(c) },
      { kind: 'item', label: t('cm.tag'), onSelect: () => onTag(c) },
      { kind: 'separator' },
      {
        kind: 'item',
        label: t('cm.copySha'),
        onSelect: () => {
          void navigator.clipboard.writeText(c.hash)
          toast(t('cm.shaCopied'))
        }
      }
    ]
  }

  if (commits === null) return <div className="center-note">{t('hs.reading')}</div>
  if (commits.length === 0) return <div className="center-note">{t('hs.empty')}</div>

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
              ? t('hs.pendingGroup', { n: pending })
              : !c.unpushed && prev?.unpushed
                ? t('hs.pushedGroup')
                : null
          return (
            <div key={c.hash}>
              {header && <div className="commit-group">{header}</div>}
              <button
                className={`crow ${current?.hash === c.hash ? 'active' : ''}`}
                onClick={() => setSelected(c.hash)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setSelected(c.hash)
                  setMenu({ x: e.clientX, y: e.clientY, commit: c })
                }}
              >
                <Avatar name={c.author} email={c.email} account={account} own={mine(c)} />
                <span className="crow-main">
                  <span className="crow-subject">{c.subject}</span>
                  <span className="crow-meta">
                    {c.author} · <span title={new Date(c.date).toLocaleString(lang)}>{timeAgo(c.date)}</span>
                  </span>
                </span>
                <span className="crow-end">
                  {c.refs.slice(0, 1).map((r) => (
                    <RefChip key={r} name={r} />
                  ))}
                  {c.unpushed && (
                    <span className="pending" title={t('hs.pending')}>
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
                  toast(t('hs.hashCopied'))
                }}
              >
                {t('common.copy')}
              </button>
              {current.refs.map((r) => (
                <RefChip key={r} name={r} />
              ))}
              {current.unpushed && <span className="chip warn">{t('hs.pending')}</span>}
            </div>
            {detail?.body && <div className="commit-body-text">{detail.body}</div>}
          </div>
          <div className="commit-files-diff">
            <div className="cfiles">
              <div className="files-head">
                {detail ? t('common.files', { n: detail.files.length }) : t('common.loading')}
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
              {file ? <DiffView text={diff} /> : <div className="diff-empty">{t('hs.noChanges')}</div>}
            </div>
          </div>
        </div>
      )}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu.commit)} onClose={() => setMenu(null)} />}
    </div>
  )
}
