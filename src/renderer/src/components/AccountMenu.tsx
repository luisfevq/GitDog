import { useEffect, useRef, useState } from 'react'
import { LANGS } from '@shared/i18n'
import type { Account } from '@shared/types'
import { useI18n } from '../i18n'
import { CheckIcon, PlusIcon, SwitchIcon } from './Icons'

interface Props {
  accounts: Account[]
  active: Account | null
  onSwitch: (login: string) => void
  version: string | null
  checking: boolean
  onCheckUpdate: () => void
  onAdd: () => void
  onRemove: (login: string) => void
}

export function AccountMenu({ accounts, active, version, checking, onCheckUpdate, onSwitch, onAdd, onRemove }: Props): JSX.Element {
  const { t, lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="account" ref={ref}>
      <button className="account-btn" onClick={() => setOpen((o) => !o)}>
        {active ? (
          <>
            <img src={active.avatarUrl} alt="" className="avatar" />
            <span className="account-login">{active.login}</span>
          </>
        ) : (
          <span className="account-login">{t('acct.none')}</span>
        )}
        <span className="switch">
          <SwitchIcon size={15} />
        </span>
      </button>

      {open && (
        <div className="popover account-pop">
          <div className="pop-label">{t('acct.accounts')}</div>
          {accounts.map((a) => (
            <div key={a.login} className="account-row">
              <button
                className="account-pick"
                onClick={() => {
                  onSwitch(a.login)
                  setOpen(false)
                }}
              >
                <img src={a.avatarUrl} alt="" className="avatar" />
                <span className="account-names">
                  <strong>{a.login}</strong>
                  {a.name && <small>{a.name}</small>}
                </span>
                {a.login === active?.login && <CheckIcon size={15} />}
              </button>
              <button
                className="link-danger"
                title={t('acct.removeTitle')}
                onClick={() => {
                  setOpen(false)
                  onRemove(a.login)
                }}
              >
                {t('common.remove')}
              </button>
            </div>
          ))}
          <div className="pop-sep" />
          <button
            className="pop-item"
            onClick={() => {
              setOpen(false)
              onAdd()
            }}
          >
            <PlusIcon size={15} /> {t('acct.add')}
          </button>
          <div className="pop-sep" />
          <div className="update-row">
            <span>{version ? t('upd.version', { version }) : 'GitDog'}</span>
            <button className="btn small" disabled={checking} onClick={onCheckUpdate}>
              {checking ? t('upd.checking') : t('upd.check')}
            </button>
          </div>
          <div className="lang-row">
            <span>{t('common.language')}</span>
            <div className="segmented">
              {LANGS.map((code) => (
                <button key={code} className={lang === code ? 'on' : ''} onClick={() => setLang(code)}>
                  {code === 'es' ? 'Español' : 'English'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
