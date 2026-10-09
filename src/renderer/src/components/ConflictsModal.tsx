import { useCallback, useEffect, useRef, useState } from 'react'
import type { MergeState } from '@shared/types'
import { useI18n } from '../i18n'
import { CheckIcon } from './Icons'
import { ConfirmModal, Modal } from './Modal'
import { useToast } from './Toast'

interface Props {
  projectId: string
  /** The window is closed but the merge stays open */
  onClose: () => void
  /** The merge was finished or aborted */
  onDone: () => void
}

const splitPath = (path: string): { dir: string; file: string } => {
  const i = path.lastIndexOf('/')
  return i === -1 ? { dir: '', file: path } : { dir: path.slice(0, i + 1), file: path.slice(i + 1) }
}

export function ConflictsModal({ projectId, onClose, onDone }: Props): JSX.Element {
  const { t, tr } = useI18n()
  const toast = useToast()
  const [state, setState] = useState<MergeState | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [confirmAbort, setConfirmAbort] = useState(false)
  // The parent passes a new function on every render. A ref keeps the polling from restarting each time.
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  const load = useCallback(async (): Promise<void> => {
    try {
      const next = await window.api.mergeState(projectId)
      // null: the merge ended somewhere else, for example in a terminal.
      if (next === null) doneRef.current()
      else setState(next)
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }, [projectId, toast])

  // The user resolves the files in another app: look again every few seconds and when this window gets focus.
  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), 2000)
    const onFocus = (): void => void load()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  const files = state?.files ?? []
  const pending = files.filter((f) => !f.resolved).length
  const allResolved = !!state && pending === 0

  const open = (path: string): void => {
    window.api.openInEditor(projectId, path).catch((e: Error) => toast(e.message, 'error'))
  }

  const proceed = async (): Promise<void> => {
    setBusy(true)
    try {
      toast(await window.api.continueMerge(projectId))
      onDone()
    } catch (e) {
      toast((e as Error).message, 'error')
      void load()
    } finally {
      setBusy(false)
    }
  }

  const abort = async (): Promise<void> => {
    setConfirmAbort(false)
    setBusy(true)
    try {
      await window.api.abortMerge(projectId)
      toast(t('cf.aborted'))
      onDone()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (confirmAbort) {
    return (
      <ConfirmModal
        danger
        title={t('cf.abortTitle')}
        body={t('cf.abortBody')}
        confirmLabel={t('cf.abort')}
        onClose={() => setConfirmAbort(false)}
        onConfirm={() => void abort()}
      />
    )
  }

  return (
    <Modal
      title={t('cf.title')}
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn" disabled={busy || !state} onClick={() => setConfirmAbort(true)}>
            {t('cf.abort')}
          </button>
          <button className="btn primary" disabled={busy || !allResolved} onClick={() => void proceed()}>
            {busy ? t('cf.continuing') : t('cf.continue')}
          </button>
        </>
      }
    >
      {!state && <p className="muted">{t('common.loading')}</p>}

      {state && (
        <>
          {state.branch && <p className="muted">{tr('cf.subtitle', { branch: state.branch, into: state.into })}</p>}

          <div className={allResolved ? 'banner-success' : 'banner-warn'}>
            {allResolved ? t('cf.allResolved') : t('cf.pending', { n: pending })}
          </div>

          <h3 className="conflict-count">{t('cf.count', { n: pending })}</h3>

          <div className="conflict-list">
            {files.map((f) => {
              const { dir, file } = splitPath(f.path)
              return (
                <div key={f.path} className="conflict-row">
                  <div className="conflict-main">
                    <span className="file-path" title={f.path}>
                      <span className="file-dir">{dir}</span>
                      {file}
                    </span>
                    <span className={f.resolved ? 'conflict-ok' : 'conflict-bad'}>
                      {f.resolved ? t('cf.fileDone') : t('cf.fileRemaining')}
                    </span>
                    {f.kind === 'deleted-by-them' && (
                      <span className="conflict-note">{tr('cf.noteDeletedByThem', { branch: state.branch })}</span>
                    )}
                    {f.kind === 'deleted-by-us' && (
                      <span className="conflict-note">
                        {tr('cf.noteDeletedByUs', { branch: state.branch, into: state.into })}
                      </span>
                    )}
                  </div>
                  <button className="btn small" title={t('cf.openTitle')} onClick={() => open(f.path)}>
                    {t('cf.open')}
                  </button>
                  <span className={`conflict-state ${f.resolved ? 'ok' : 'bad'}`}>
                    {f.resolved ? <CheckIcon size={14} /> : '!'}
                  </span>
                </div>
              )
            })}
          </div>

          <p className="hint">
            <button className="text-link" onClick={() => void window.api.openInTerminal(projectId)}>
              {t('cf.terminal')}
            </button>
            {t('cf.manual')}
          </p>
        </>
      )}
    </Modal>
  )
}
