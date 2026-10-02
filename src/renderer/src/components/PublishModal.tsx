import { useState } from 'react'
import type { Project, Snapshot } from '@shared/types'
import { Modal } from './Modal'
import { useToast } from './Toast'

interface Props {
  project: Project
  login: string
  onClose: () => void
  onDone: (state: Snapshot) => void
}

export function PublishModal({ project, login, onClose, onDone }: Props): JSX.Element {
  const toast = useToast()
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  const [busy, setBusy] = useState(false)

  const publish = async (): Promise<void> => {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      const state = await window.api.publishProject(project.id, {
        name: name.trim(),
        description: description.trim(),
        private: isPrivate
      })
      toast(`Publicado en ${login}/${name.trim()}`)
      onDone(state)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`Publicar en ${login}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={!name.trim() || busy} onClick={publish}>
            {busy ? 'Publicando…' : 'Publicar'}
          </button>
        </>
      }
    >
      <label className="field">
        <span>Nombre del repositorio</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        <span>Descripción (opcional)</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label className="check-row">
        <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
        <span>Repositorio privado</span>
      </label>
    </Modal>
  )
}
