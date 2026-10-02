import { useEffect, useRef, useState } from 'react'
import type { DeviceCode, Snapshot } from '@shared/types'
import { Modal } from './Modal'
import { useToast } from './Toast'

interface Props {
  onClose: () => void
  onDone: (state: Snapshot) => void
}

const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=repo&description=GitDog'

export function AddAccountModal({ onClose, onDone }: Props): JSX.Element {
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
    toast(`Cuenta ${state.activeAccount} conectada`)
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
      title="Conectar cuenta de GitHub"
      onClose={close}
      footer={
        manual ? (
          <>
            <button className="btn" onClick={close}>
              Cancelar
            </button>
            <button className="btn primary" disabled={!token.trim() || busy} onClick={tokenLogin}>
              {busy ? 'Conectando…' : 'Conectar'}
            </button>
          </>
        ) : (
          <button className="btn" onClick={close}>
            Cancelar
          </button>
        )
      }
    >
      {oauth === null && <p className="muted">Cargando…</p>}

      {oauth && !manual && !code && (
        <>
          <p className="muted">
            Se abrirá GitHub en tu navegador. Asegúrate de estar ahí con la cuenta que quieres agregar.
          </p>
          <button className="btn primary big wide-btn" disabled={busy} onClick={browserLogin}>
            Iniciar sesión con GitHub
          </button>
          <button className="text-link" onClick={() => setManual(true)}>
            Prefiero usar un token
          </button>
        </>
      )}

      {code && (
        <div className="device">
          <p className="muted">Pega este código en GitHub para autorizar a GitDog. Ya lo copié por ti.</p>
          <div className="device-code">{code.userCode}</div>
          <div className="row center">
            <button className="btn" onClick={() => void navigator.clipboard.writeText(code.userCode)}>
              Copiar de nuevo
            </button>
            <button className="btn" onClick={() => window.api.openExternal(code.verificationUri)}>
              Abrir GitHub
            </button>
          </div>
          <p className="hint waiting">
            <span className="spinner" /> Esperando autorización…
          </p>
          <button className="text-link" onClick={stopWaiting}>
            Cancelar este intento
          </button>
        </div>
      )}

      {manual && (
        <>
          <ol className="steps">
            <li>
              Abre <b>github.com</b> en el navegador y entra con la cuenta que quieres agregar.
            </li>
            <li>
              Arriba a la derecha pulsa tu <b>foto de perfil</b> y elige <b>Settings</b>.
            </li>
            <li>
              En la barra izquierda, baja hasta el final y pulsa <b>Developer settings</b>.
            </li>
            <li>
              Pulsa <b>Personal access tokens</b> y luego <b>Tokens (classic)</b>.
            </li>
            <li>
              Pulsa <b>Generate new token</b> (arriba a la derecha) y elige <b>Generate new token (classic)</b>. GitHub puede
              pedirte la contraseña o el código 2FA.
            </li>
            <li>
              En <b>Note</b> escribe <code>GitDog</code>. En <b>Expiration</b> elige <b>No expiration</b>. Marca la casilla{' '}
              <code>repo</code>.
            </li>
            <li>
              Baja hasta el final y pulsa <b>Generate token</b>.
            </li>
            <li>
              Copia el texto que empieza con <code>ghp_</code>. GitHub lo muestra solo una vez. Pégalo en el campo de abajo.
            </li>
          </ol>
          <button className="btn" onClick={() => window.api.openExternal(TOKEN_URL)}>
            Atajo: abrir la página del paso 6
          </button>
          <p className="hint">
            El atajo salta los pasos 2 a 5 y deja <code>GitDog</code> y <code>repo</code> ya puestos. Revisa que sigues con la
            cuenta correcta.
          </p>
          <label className="field">
            <span>Token</span>
            <input
              type="password"
              autoFocus
              placeholder="ghp_…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && tokenLogin()}
            />
          </label>
          <p className="hint">El token se guarda cifrado en el Keychain de este Mac. No sale de aquí.</p>
          {oauth && (
            <button className="text-link" onClick={() => setManual(false)}>
              Volver al inicio de sesión con GitHub
            </button>
          )}
        </>
      )}
    </Modal>
  )
}
