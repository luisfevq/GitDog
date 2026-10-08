import { useCallback, useEffect, useMemo, useState } from 'react'
import { githubWebUrl } from '@shared/github-url'
import type { Project, Snapshot, UpdateInfo } from '@shared/types'
import { useI18n } from './i18n'
import { AccountMenu } from './components/AccountMenu'
import { AddAccountModal } from './components/AddAccountModal'
import { CloneModal } from './components/CloneModal'
import { ExternalIcon } from './components/Icons'
import { ConfirmModal } from './components/Modal'
import { RepoView } from './components/RepoView'
import { Sidebar } from './components/Sidebar'
import { ToastProvider, useToast } from './components/Toast'

type Dialog =
  | { kind: 'addAccount' }
  | { kind: 'clone' }
  | { kind: 'initRepo'; path: string }
  | { kind: 'removeAccount'; login: string }
  | { kind: 'removeProject'; project: Project }
  | null

/** How long a closed update notice stays hidden. */
const UPDATE_REMINDER_MS = 6 * 60 * 60 * 1000

const EMPTY: Snapshot = { accounts: [], projects: [], activeAccount: null }

function Workspace(): JSX.Element {
  const { t, tr } = useI18n()
  const toast = useToast()
  const [state, setState] = useState<Snapshot | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  // Closing the notice hides it for 6 hours. It comes back after that, or sooner for a newer version.
  const [dismissal, setDismissal] = useState<{ version: string; at: number } | null>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('gitdog.updateDismissed') ?? 'null') as { version: string; at: number } | null
      return saved && typeof saved.version === 'string' && typeof saved.at === 'number' ? saved : null
    } catch {
      return null
    }
  })
  const [now, setNow] = useState(() => Date.now())

  // Re-evaluate once a minute, so the notice returns on time even if the app stays open.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const [version, setVersion] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  /** Looks for a newer release. A manual check also says what it found, and shows a closed notice again. */
  const checkUpdates = useCallback(
    async (manual: boolean): Promise<void> => {
      if (manual) setChecking(true)
      const result = await window.api.checkUpdate().catch(() => null)
      if (manual) setChecking(false)
      if (!result) {
        if (manual) toast(t('upd.failed'), 'error')
        return
      }
      setVersion(result.current)
      setUpdate(result.update)
      if (!manual) return
      if (result.failed) toast(t('upd.failed'), 'error')
      else if (result.unsupported) toast(t('upd.unsupported', { version: result.current }))
      else if (result.update) {
        setDismissal(null)
        try {
          localStorage.removeItem('gitdog.updateDismissed')
        } catch {
          /* nothing to clear */
        }
        toast(t('upd.found', { version: result.update.version }))
      } else toast(t('upd.upToDate', { version: result.current }))
    },
    [t, toast]
  )

  // Look for a new release when GitDog opens, and every 6 hours after that.
  useEffect(() => {
    void checkUpdates(false)
    const timer = setInterval(() => void checkUpdates(false), UPDATE_REMINDER_MS)
    return () => clearInterval(timer)
  }, [checkUpdates])

  const dismissUpdate = (version: string): void => {
    const value = { version, at: Date.now() }
    setDismissal(value)
    try {
      localStorage.setItem('gitdog.updateDismissed', JSON.stringify(value))
    } catch {
      /* the notice just comes back sooner */
    }
  }

  const showUpdate =
    !!update && !(dismissal && dismissal.version === update.version && now - dismissal.at < UPDATE_REMINDER_MS)

  useEffect(() => {
    window.api
      .getState()
      .then(setState)
      .catch((e: Error) => toast(e.message, 'error'))
  }, [toast])

  const apply = useCallback((next: Snapshot) => setState(next), [])
  const fail = useCallback((e: unknown) => toast((e as Error).message, 'error'), [toast])

  const current = state ?? EMPTY
  const account = current.accounts.find((a) => a.login === current.activeAccount) ?? null
  const projects = useMemo(
    () => current.projects.filter((p) => p.accountLogin === current.activeAccount),
    [current.projects, current.activeAccount]
  )
  const selected = projects.find((p) => p.id === selectedId) ?? projects[0] ?? null

  const repoUrl = githubWebUrl(selected?.remoteUrl ?? null)

  const switchAccount = (login: string): void => {
    setSelectedId(null)
    window.api.setActiveAccount(login).then(apply).catch(fail)
  }

  const addLocal = async (): Promise<void> => {
    try {
      const path = await window.api.chooseFolder()
      if (!path) return
      if (await window.api.isGitRepo(path)) await finishAddLocal(path, false)
      else setDialog({ kind: 'initRepo', path })
    } catch (e) {
      fail(e)
    }
  }

  const finishAddLocal = async (path: string, init: boolean): Promise<void> => {
    try {
      const next = await window.api.addLocalProject(path, init)
      apply(next)
      setSelectedId(next.projects.find((p) => p.path === path)?.id ?? null)
    } catch (e) {
      fail(e)
    }
  }

  const closeDialog = useCallback(() => setDialog(null), [])

  return (
    <div className="app">
      <Sidebar
        account={account}
        projects={projects}
        selectedId={selected?.id ?? null}
        onSelect={setSelectedId}
        onAddLocal={addLocal}
        onClone={() => setDialog({ kind: 'clone' })}
        onRemove={(project) => setDialog({ kind: 'removeProject', project })}
      />

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-title">{selected ? selected.name : 'GitDog'}</div>
            {repoUrl && (
              <button
                className="repo-link"
                title={repoUrl}
                onClick={() => window.api.openExternal(repoUrl).catch(fail)}
              >
                <ExternalIcon size={13} /> {t('app.openOnGithub')}
              </button>
            )}
          </div>
          <AccountMenu
            accounts={current.accounts}
            active={account}
            onSwitch={switchAccount}
            version={version}
            checking={checking}
            onCheckUpdate={() => void checkUpdates(true)}
            onAdd={() => setDialog({ kind: 'addAccount' })}
            onRemove={(login) => setDialog({ kind: 'removeAccount', login })}
          />
        </header>

        {update && showUpdate && (
          <div className="banner-ok update-banner">
            <span>{tr('app.updateAvailable', { version: update.version })}</span>
            <button className="btn small primary" onClick={() => window.api.openExternal(update.url).catch(fail)}>
              {t('app.download')}
            </button>
            <button className="icon-btn" aria-label={t('app.dismiss')} onClick={() => dismissUpdate(update.version)}>
              ×
            </button>
          </div>
        )}

        <section className="content">
          {state === null ? null : !account ? (
            <div className="welcome">
              <h1>GitDog</h1>
              <p>{t('app.welcomeText')}</p>
              <button className="btn primary big" onClick={() => setDialog({ kind: 'addAccount' })}>
                {t('app.connectAccount')}
              </button>
            </div>
          ) : selected ? (
            <RepoView key={selected.id} project={selected} account={account} onState={apply} />
          ) : (
            <div className="welcome">
              <h1>{account.login}</h1>
              <p>{t('app.emptyAccountText')}</p>
              <div className="row">
                <button className="btn big" onClick={addLocal}>
                  {t('app.addFolder')}
                </button>
                <button className="btn primary big" onClick={() => setDialog({ kind: 'clone' })}>
                  {t('app.cloneRepo')}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {dialog?.kind === 'addAccount' && (
        <AddAccountModal
          onClose={closeDialog}
          onDone={(next) => {
            apply(next)
            setSelectedId(null)
            closeDialog()
          }}
        />
      )}
      {dialog?.kind === 'clone' && account && (
        <CloneModal
          login={account.login}
          onClose={closeDialog}
          onDone={(next) => {
            apply(next)
            setSelectedId(next.projects[next.projects.length - 1]?.id ?? null)
            closeDialog()
          }}
        />
      )}
      {dialog?.kind === 'initRepo' && (
        <ConfirmModal
          title={t('app.initTitle')}
          body={t('app.initBody', { path: dialog.path, login: account?.login ?? '' })}
          confirmLabel={t('app.initConfirm')}
          onClose={closeDialog}
          onConfirm={() => {
            const { path } = dialog
            closeDialog()
            void finishAddLocal(path, true)
          }}
        />
      )}
      {dialog?.kind === 'removeProject' && (
        <ConfirmModal
          title={t('app.removeProjectTitle')}
          body={t('app.removeProjectBody', { name: dialog.project.name })}
          confirmLabel={t('common.remove')}
          onClose={closeDialog}
          onConfirm={() => {
            const { project } = dialog
            closeDialog()
            window.api.removeProject(project.id).then(apply).catch(fail)
          }}
        />
      )}
      {dialog?.kind === 'removeAccount' && (
        <ConfirmModal
          title={t('app.removeAccountTitle', { login: dialog.login })}
          body={t('app.removeAccountBody')}
          confirmLabel={t('app.removeAccountConfirm')}
          onClose={closeDialog}
          onConfirm={() => {
            const { login } = dialog
            closeDialog()
            setSelectedId(null)
            window.api.removeAccount(login).then(apply).catch(fail)
          }}
        />
      )}
    </div>
  )
}

export function App(): JSX.Element {
  return (
    <ToastProvider>
      <Workspace />
    </ToastProvider>
  )
}
