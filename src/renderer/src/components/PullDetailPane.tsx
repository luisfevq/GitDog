import { useCallback, useEffect, useState } from 'react'
import type { PullDetail, PullEvent, PullFile, PullRequest } from '@shared/types'
import { useI18n } from '../i18n'
import { timeAgo } from '../lib/time'
import { DiffView } from './DiffView'
import { BranchIcon, ExternalIcon } from './Icons'
import { MergeModal } from './MergeModal'
import { ReviewModal } from './ReviewModal'
import { useToast } from './Toast'

interface Props {
  projectId: string
  login: string
  pull: PullRequest
  /** A review or merge changed something: reload the list and the counters. */
  onChanged: () => void
}

type Section = 'summary' | 'files' | 'conversation'

const STATE_KEY = { open: 'pr.stateOpen', closed: 'pr.stateClosed', merged: 'pr.stateMerged' } as const
const FILE_BADGE: Record<string, string> = { added: 'A', removed: 'D', modified: 'M', renamed: 'R', copied: 'C', changed: 'M' }
const REVIEW_KEY = {
  APPROVED: 'pr.reviewApproved',
  CHANGES_REQUESTED: 'pr.reviewChanges',
  COMMENTED: 'pr.reviewCommented',
  DISMISSED: 'pr.reviewDismissed'
} as const

export function PullDetailPane({ projectId, login, pull, onChanged }: Props): JSX.Element {
  const { t } = useI18n()
  const toast = useToast()
  const [section, setSection] = useState<Section>('summary')
  const [detail, setDetail] = useState<PullDetail | null>(null)
  const [files, setFiles] = useState<PullFile[] | null>(null)
  const [events, setEvents] = useState<PullEvent[] | null>(null)
  const [openFile, setOpenFile] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [merging, setMerging] = useState(false)

  const number = pull.number

  const loadDetail = useCallback((): void => {
    window.api
      .pullDetail(projectId, number)
      .then(setDetail)
      .catch(() => undefined) // the list data is enough to show the basics
  }, [projectId, number])

  const loadEvents = useCallback((): void => {
    window.api
      .pullConversation(projectId, number)
      .then(setEvents)
      .catch((e: Error) => {
        setEvents([])
        toast(e.message, 'error')
      })
  }, [projectId, number, toast])

  useEffect(loadDetail, [loadDetail])

  // Files and conversation load the first time their section opens.
  useEffect(() => {
    if (section === 'files' && files === null) {
      window.api
        .pullFiles(projectId, number)
        .then((list) => {
          setFiles(list)
          setOpenFile(list[0]?.path ?? null)
        })
        .catch((e: Error) => {
          setFiles([])
          toast(e.message, 'error')
        })
    }
    if (section === 'conversation' && events === null) loadEvents()
  }, [section, files, events, projectId, number, toast, loadEvents])

  const open = (url: string): void => {
    window.api.openExternal(url).catch((e: Error) => toast(e.message, 'error'))
  }

  const shown = detail ?? pull
  const isDraft = shown.draft && shown.state === 'open'
  const isOwn = pull.author === login

  return (
    <div className="pr-detail">
      <div className="pr-detail-top">
        <div className="pr-detail-head">
          <h3>
            {shown.title} <span className="pr-num">#{shown.number}</span>
          </h3>
          <button className="btn" onClick={() => open(shown.url)}>
            <ExternalIcon size={14} /> {t('app.openOnGithub')}
          </button>
        </div>
        <div className="pr-meta">
          <span className={`state-pill ${isDraft ? 'draft' : shown.state}`}>{isDraft ? t('pr.draft') : t(STATE_KEY[shown.state])}</span>
          {shown.authorAvatar && <img src={shown.authorAvatar} alt="" className="avatar small" />}
          <span>
            <b>{shown.author}</b> · {timeAgo(shown.createdAt)}
          </span>
          <span className="pr-branches">
            <BranchIcon size={14} /> <code>{shown.head}</code> → <code>{shown.base}</code>
          </span>
        </div>
        <div className="subtabs">
          <button className={section === 'summary' ? 'on' : ''} onClick={() => setSection('summary')}>
            {t('pr.tabSummary')}
          </button>
          <button className={section === 'files' ? 'on' : ''} onClick={() => setSection('files')}>
            {t('pr.tabFiles')} {detail && <span className="pill">{detail.changedFiles}</span>}
          </button>
          <button className={section === 'conversation' ? 'on' : ''} onClick={() => setSection('conversation')}>
            {t('pr.tabConversation')} {detail && detail.comments > 0 && <span className="pill">{detail.comments}</span>}
          </button>
        </div>
      </div>

      <div className="pr-scroll">
        {section === 'summary' && (
          <div className="pr-pad">
            {detail && (
              <div className="pr-stats">
                <span className="add">+{detail.additions}</span>
                <span className="del">−{detail.deletions}</span>
                <span>{t('common.files', { n: detail.changedFiles })}</span>
                <span>{t('common.commits', { n: detail.commits })}</span>
                <span>{t('pr.statComments', { n: detail.comments })}</span>
              </div>
            )}
            <div className="pr-body">{shown.body.trim() || t('pr.noDescription')}</div>
          </div>
        )}

        {section === 'files' && (
          <div className="pr-files">
            {files === null && <div className="empty-inline">{t('pr.loadingFiles')}</div>}
            {files?.length === 0 && <div className="empty-inline">{t('pr.noFiles')}</div>}
            {files?.map((f) => (
              <div key={f.path} className="pr-file">
                <button className="pr-file-head" onClick={() => setOpenFile(openFile === f.path ? null : f.path)}>
                  <span className={`badge s-${FILE_BADGE[f.status] ?? 'M'}`}>{FILE_BADGE[f.status] ?? 'M'}</span>
                  <span className="file-path" title={f.path}>
                    {f.previousPath ? `${f.previousPath} → ` : ''}
                    {f.path}
                  </span>
                  <span className="add">+{f.additions}</span>
                  <span className="del">−{f.deletions}</span>
                </button>
                {openFile === f.path &&
                  (f.patch ? (
                    <div className="pr-file-diff">
                      <DiffView text={f.patch} />
                    </div>
                  ) : (
                    <div className="diff-empty">{t('pr.binary')}</div>
                  ))}
              </div>
            ))}
          </div>
        )}

        {section === 'conversation' && (
          <div className="pr-pad">
            {events === null && <div className="empty-inline">{t('pr.loadingConversation')}</div>}
            {events?.length === 0 && <div className="empty-inline">{t('pr.noConversation')}</div>}
            {events?.map((e) => (
              <div key={e.id} className="thread">
                {e.authorAvatar ? <img src={e.authorAvatar} alt="" className="avatar" /> : <span className="avatar" />}
                <div className="thread-main">
                  <div className="thread-head">
                    <b>{e.author}</b>
                    {e.kind === 'review' && e.state && (
                      <span className={`chip review-${e.state}`}>{e.state in REVIEW_KEY ? t(REVIEW_KEY[e.state as keyof typeof REVIEW_KEY]) : e.state}</span>
                    )}
                    {e.kind === 'line' && e.path && <code>{e.path}</code>}
                    <span className="thread-time">{timeAgo(e.createdAt)}</span>
                  </div>
                  {e.body.trim() && <div className="thread-body">{e.body}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pull.state === 'open' && (
        <div className="pr-actions">
          <span className="hint">{isOwn ? t('pr.ownPr') : t('pr.reviewingAs', { login })}</span>
          <div className="grow" />
          <button className="btn" onClick={() => setReviewing(true)}>
            {t('pr.review')}
          </button>
          <button className="btn primary" disabled={!detail} onClick={() => setMerging(true)}>
            {t('pr.merge')}
          </button>
        </div>
      )}

      {reviewing && (
        <ReviewModal
          projectId={projectId}
          pull={pull}
          isOwn={isOwn}
          onClose={() => setReviewing(false)}
          onDone={() => {
            setReviewing(false)
            setEvents(null)
            if (section === 'conversation') loadEvents()
            loadDetail()
            onChanged()
          }}
        />
      )}
      {merging && detail && (
        <MergeModal
          projectId={projectId}
          pull={detail}
          onClose={() => setMerging(false)}
          onDone={() => {
            setMerging(false)
            onChanged()
          }}
        />
      )}
    </div>
  )
}
