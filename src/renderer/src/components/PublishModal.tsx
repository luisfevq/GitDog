import { useState } from 'react'
import type { Project, Snapshot } from '@shared/types'
import { useI18n } from '../i18n'
import { Modal } from './Modal'
import { useToast } from './Toast'

interface Props {
  project: Project
  login: string
  onClose: () => void
  onDone: (state: Snapshot) => void
}

export function PublishModal({ project, login, onClose, onDone }: Props): JSX.Element {
  const { t } = useI18n()
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
      toast(t('publish.done', { login, name: name.trim() }))
      onDone(state)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={t('publish.title', { login })}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn primary" disabled={!name.trim() || busy} onClick={publish}>
            {busy ? t('publish.busy') : t('publish.button')}
          </button>
        </>
      }
    >
      <label className="field">
        <span>{t('publish.name')}</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        <span>{t('publish.description')}</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label className="check-row">
        <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
        <span>{t('publish.private')}</span>
      </label>
    </Modal>
  )
}
