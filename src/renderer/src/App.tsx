import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Project, Snapshot } from '@shared/types'
import { AccountMenu } from './components/AccountMenu'
import { AddAccountModal } from './components/AddAccountModal'
import { CloneModal } from './components/CloneModal'
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

const EMPTY: Snapshot = { accounts: [], projects: [], activeAccount: null }

function Workspace(): JSX.Element {
  const toast = useToast()
  const [state, setState] = useState<Snapshot | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)

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
          <div className="topbar-title">{selected ? selected.name : 'GitDog'}</div>
          <AccountMenu
            accounts={current.accounts}
            active={account}
            onSwitch={switchAccount}
            onAdd={() => setDialog({ kind: 'addAccount' })}
            onRemove={(login) => setDialog({ kind: 'removeAccount', login })}
          />
        </header>

        <section className="content">
          {state === null ? null : !account ? (
            <div className="welcome">
              <h1>GitDog</h1>
              <p>Conecta tus cuentas de GitHub y mueve tus proyectos entre ellas sin confundirte.</p>
              <button className="btn primary big" onClick={() => setDialog({ kind: 'addAccount' })}>
                Conectar cuenta de GitHub
              </button>
            </div>
          ) : selected ? (
            <RepoView key={selected.id} project={selected} account={account} onState={apply} />
          ) : (
            <div className="welcome">
              <h1>{account.login}</h1>
              <p>Agrega una carpeta local o clona un repositorio de esta cuenta.</p>
              <div className="row">
                <button className="btn big" onClick={addLocal}>
                  Agregar carpeta local
                </button>
                <button className="btn primary big" onClick={() => setDialog({ kind: 'clone' })}>
                  Clonar repositorio
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
          title="Esta carpeta no es un repositorio"
          body={`${dialog.path}\n\n¿Quieres inicializar Git aquí? Después podrás hacer commits y publicarla en ${account?.login}.`}
          confirmLabel="Inicializar Git"
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
          title="Quitar de la lista"
          body={`"${dialog.project.name}" se quita de GitDog. La carpeta y sus archivos no se borran.`}
          confirmLabel="Quitar"
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
          title={`Quitar la cuenta ${dialog.login}`}
          body="Se borra el token de este Mac y se quitan sus proyectos de la lista. Las carpetas y los repositorios en GitHub no se tocan."
          confirmLabel="Quitar cuenta"
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
