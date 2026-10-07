import type { Account, Project } from '@shared/types'
import { useI18n } from '../i18n'
import { CloneIcon, CloseIcon, FolderIcon, MailIcon, PlusIcon } from './Icons'

const CONTACT = 'mailto:luisfevq+gitdog@gmail.com?subject=GitDog'

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
  const { t, tr } = useI18n()
  return (
    <aside className="sidebar">
      <div className="sidebar-drag" />
      <div className="sidebar-title">
        <span>{t('side.projects')}</span>
        {account && <small>{account.login}</small>}
      </div>

      <nav className="project-list">
        {projects.map((p) => (
          <div key={p.id} className={`project ${p.id === selectedId ? 'active' : ''}`}>
            <button className="project-main" onClick={() => onSelect(p.id)} title={p.path}>
              <FolderIcon size={15} />
              <span>{p.name}</span>
            </button>
            <button className="icon-btn project-x" title={t('app.removeProjectTitle')} onClick={() => onRemove(p)}>
              <CloseIcon size={13} />
            </button>
          </div>
        ))}
        {account && projects.length === 0 && <div className="sidebar-empty">{t('side.empty')}</div>}
      </nav>

      {account && (
        <div className="sidebar-actions">
          <button className="side-btn" onClick={onAddLocal}>
            <PlusIcon size={15} /> {t('side.localFolder')}
          </button>
          <button className="side-btn" onClick={onClone}>
            <CloneIcon size={15} /> {t('app.cloneRepo')}
          </button>
        </div>
      )}

      <button
        className="credit"
        title={t('side.creditTitle')}
        onClick={() => void window.api.openExternal(CONTACT)}
      >
        <span>
          {tr('side.creditBy')}
          <small>{t('side.developer')}</small>
        </span>
        <MailIcon size={15} />
      </button>
    </aside>
  )
}
