import type { Account, Project } from '@shared/types'
import { CloneIcon, CloseIcon, FolderIcon, PlusIcon } from './Icons'

interface Props {
  account: Account | null
  projects: Project[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAddLocal: () => void
  onClone: () => void
  onRemove: (project: Project) => void
}

export function Sidebar({ account, projects, selectedId, onSelect, onAddLocal, onClone, onRemove }: Props): JSX.Element {
  return (
    <aside className="sidebar">
      <div className="sidebar-drag" />
      <div className="sidebar-title">
        <span>Proyectos</span>
        {account && <small>{account.login}</small>}
      </div>

      <nav className="project-list">
        {projects.map((p) => (
          <div key={p.id} className={`project ${p.id === selectedId ? 'active' : ''}`}>
            <button className="project-main" onClick={() => onSelect(p.id)} title={p.path}>
              <FolderIcon size={15} />
              <span>{p.name}</span>
            </button>
            <button className="icon-btn project-x" title="Quitar de la lista" onClick={() => onRemove(p)}>
              <CloseIcon size={13} />
            </button>
          </div>
        ))}
        {account && projects.length === 0 && <div className="sidebar-empty">Aún no hay proyectos en esta cuenta.</div>}
      </nav>

      {account && (
        <div className="sidebar-actions">
          <button className="side-btn" onClick={onAddLocal}>
            <PlusIcon size={15} /> Carpeta local
          </button>
          <button className="side-btn" onClick={onClone}>
            <CloneIcon size={15} /> Clonar repositorio
          </button>
        </div>
      )}
    </aside>
  )
}
