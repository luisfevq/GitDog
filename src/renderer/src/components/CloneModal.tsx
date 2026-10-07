import { useEffect, useMemo, useState } from 'react'
import type { Repo, Snapshot } from '@shared/types'
import { useI18n } from '../i18n'
import { useGitProgress } from '../lib/useGitProgress'
import { LockIcon } from './Icons'
import { Modal } from './Modal'
import { ProgressBar } from './ProgressBar'
import { useToast } from './Toast'

interface Props {
  login: string
  onClose: () => void
  onDone: (state: Snapshot) => void
}

const DIR_KEY = 'gitdog.cloneDir'

export function CloneModal({ login, onClose, onDone }: Props): JSX.Element {
  const { t } = useI18n()
  const toast = useToast()
  const [repos, setRepos] = useState<Repo[] | null>(null)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Repo | null>(null)
  const [dir, setDir] = useState<string>(() => localStorage.getItem(DIR_KEY) ?? '')
  const [busy, setBusy] = useState(false)
  const progress = useGitProgress('clone', busy)

  useEffect(() => {
    let cancelled = false
    window.api
      .listRepos(login)
      .then((r) => !cancelled && setRepos(r))
      .catch((e: Error) => {
        toast(e.message, 'error')
        if (!cancelled) setRepos([])
      })
    return () => {
      cancelled = true
    }
  }, [login, toast])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (repos ?? []).filter((r) => r.fullName.toLowerCase().includes(q))
  }, [repos, query])

  const chooseDir = async (): Promise<void> => {
    const chosen = await window.api.chooseFolder()
    if (chosen) setDir(chosen)
  }

  const clone = async (): Promise<void> => {
    if (!picked || !dir) return
    setBusy(true)
    try {
      localStorage.setItem(DIR_KEY, dir)
      const state = await window.api.cloneRepo(login, picked.cloneUrl, dir, picked.name)
      toast(t('clone.done', { name: picked.name }))
      onDone(state)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={t('clone.title', { login })}
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn primary" disabled={!picked || !dir || busy} onClick={clone}>
            {busy ? t('clone.busy') : t('clone.button')}
          </button>
        </>
      }
    >
      <input
        className="search"
        placeholder={t('clone.search')}
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="repo-list">
        {repos === null && <div className="empty-inline">{t('clone.loading')}</div>}
        {repos !== null && filtered.length === 0 && <div className="empty-inline">{t('common.noResults')}</div>}
        {filtered.map((r) => (
          <button
            key={r.fullName}
            className={`repo-row ${picked?.fullName === r.fullName ? 'active' : ''}`}
            onClick={() => setPicked(r)}
          >
            <span className="repo-name">
              {r.fullName} {r.private && <LockIcon size={12} />}
            </span>
            {r.description && <span className="repo-desc">{r.description}</span>}
          </button>
        ))}
      </div>
      {busy && <ProgressBar progress={progress} fallback={t('clone.busy')} />}
      <div className="dest-row">
        <span className="dest-path" title={dir}>
          {dir ? `${dir}/${picked?.name ?? ''}` : t('clone.chooseWhere')}
        </span>
        <button className="btn" onClick={chooseDir}>
          {t('clone.chooseFolder')}
        </button>
      </div>
    </Modal>
  )
}
