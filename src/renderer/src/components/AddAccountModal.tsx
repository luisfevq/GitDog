import { useEffect, useRef, useState } from 'react'
import type { DeviceCode, Snapshot } from '@shared/types'
import { useI18n } from '../i18n'
import { Modal } from './Modal'
import { useToast } from './Toast'

interface Props {
  onClose: () => void
  onDone: (state: Snapshot) => void
}

const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=repo&description=GitDog'

export function AddAccountModal({ onClose, onDone }: Props): JSX.Element {
  const { t, tr } = useI18n()
  const toast = useToast()
  const [oauth, setOauth] = useState<boolean | null>(null)
  const [manual, setManual] = useState(false)
  const [code, setCode] = useState<DeviceCode | null>(null)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const cancelled = useRef(false)

  useEffect(() => {
    window.api
      .oauthAvailable()
      .then((ok) => {
        setOauth(ok)
        setManual(!ok)
      })
      .catch(() => {
        setOauth(false)
        setManual(true)
      })
  }, [])

  const close = (): void => {
    cancelled.current = true
    void window.api.cancelLogin()
    onClose()
  }

  const finish = (state: Snapshot): void => {
    toast(t('login.connected', { login: state.activeAccount ?? '' }))
    onDone(state)
  }

  const browserLogin = async (): Promise<void> => {
    cancelled.current = false
    setBusy(true)
    try {
      setCode(await window.api.beginLogin())
      finish(await window.api.finishLogin())
    } catch (e) {
      if (!cancelled.current) toast((e as Error).message, 'error')
    } finally {
      setCode(null)
      setBusy(false)
    }
  }

  const tokenLogin = async (): Promise<void> => {
    if (!token.trim() || busy) return
    setBusy(true)
    try {
      finish(await window.api.addAccount(token))
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const stopWaiting = (): void => {
    cancelled.current = true
    void window.api.cancelLogin()
  }

  return (
    <Modal
      title={t('login.title')}
      onClose={close}
      footer={
        manual ? (
          <>
            <button className="btn" onClick={close}>
              {t('common.cancel')}
            </button>
            <button className="btn primary" disabled={!token.trim() || busy} onClick={tokenLogin}>
              {busy ? t('login.connecting') : t('login.connect')}
            </button>
          </>
        ) : (
          <button className="btn" onClick={close}>
            {t('common.cancel')}
          </button>
        )
      }
    >
      {oauth === null && <p className="muted">{t('common.loading')}</p>}

      {oauth && !manual && !code && (
        <>
          <p className="muted">{t('login.browserIntro')}</p>
          <button className="btn primary big wide-btn" disabled={busy} onClick={browserLogin}>
            {t('login.withGithub')}
          </button>
          <button className="text-link" onClick={() => setManual(true)}>
            {t('login.useToken')}
          </button>
        </>
      )}

      {code && (
        <div className="device">
          <p className="muted">{t('login.codeIntro')}</p>
          <div className="device-code">{code.userCode}</div>
          <div className="row center">
            <button className="btn" onClick={() => void navigator.clipboard.writeText(code.userCode)}>
              {t('login.copyAgain')}
            </button>
            <button className="btn" onClick={() => window.api.openExternal(code.verificationUri)}>
              {t('login.openGithub')}
            </button>
          </div>
          <p className="hint waiting">
            <span className="spinner" /> {t('login.waiting')}
          </p>
          <button className="text-link" onClick={stopWaiting}>
            {t('login.cancelAttempt')}
          </button>
        </div>
      )}

      {manual && (
        <>
          <ol className="steps">
            {(['login.step1', 'login.step2', 'login.step3', 'login.step4', 'login.step5', 'login.step6', 'login.step7', 'login.step8'] as const).map((key) => (
              <li key={key}>{tr(key)}</li>
            ))}
          </ol>
          <button className="btn" onClick={() => window.api.openExternal(TOKEN_URL)}>
            {t('login.shortcut')}
          </button>
          <p className="hint">{tr('login.shortcutHint')}</p>
          <label className="field">
            <span>{t('login.token')}</span>
            <input
              type="password"
              autoFocus
              placeholder="ghp_…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && tokenLogin()}
            />
          </label>
          <p className="hint">{t('login.tokenHint')}</p>
          {oauth && (
            <button className="text-link" onClick={() => setManual(false)}>
              {t('login.backToGithub')}
            </button>
          )}
        </>
      )}
    </Modal>
  )
}
