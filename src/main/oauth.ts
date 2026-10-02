/**
 * GitHub OAuth "device flow": no client secret and no callback server needed.
 * Setup (one time, free): GitHub > Settings > Developer settings > OAuth Apps > New OAuth App.
 * Tick "Enable Device Flow", then paste the Client ID below or set GITDOG_CLIENT_ID.
 */
const CLIENT_ID = process.env['GITDOG_CLIENT_ID'] || ''

export interface DeviceStart {
  deviceCode: string
  userCode: string
  verificationUri: string
  expiresIn: number
  interval: number
}

export const isConfigured = (): boolean => CLIENT_ID.length > 0

async function post<T>(url: string, body: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'GitDog' },
    body: JSON.stringify(body)
  })
  return (await res.json()) as T
}

export async function startDeviceFlow(): Promise<DeviceStart> {
  if (!isConfigured()) throw new Error('El login por navegador no está configurado.')
  const r = await post<{
    device_code?: string
    user_code?: string
    verification_uri?: string
    expires_in?: number
    interval?: number
    error?: string
  }>('https://github.com/login/device/code', { client_id: CLIENT_ID, scope: 'repo' })

  if (!r.device_code || !r.user_code || !r.verification_uri) {
    throw new Error(
      r.error === 'device_flow_disabled'
        ? 'Activa "Device Flow" en la OAuth App de GitHub.'
        : `GitHub no pudo iniciar el login (${r.error ?? 'sin respuesta'}).`
    )
  }
  return {
    deviceCode: r.device_code,
    userCode: r.user_code,
    verificationUri: r.verification_uri,
    expiresIn: r.expires_in ?? 900,
    interval: r.interval ?? 5
  }
}

const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const cancelled = (): Error => new Error('Inicio de sesión cancelado.')
    if (signal.aborted) return reject(cancelled())
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(cancelled())
      },
      { once: true }
    )
  })

export async function pollForToken(start: DeviceStart, signal: AbortSignal): Promise<string> {
  let interval = start.interval
  const deadline = Date.now() + start.expiresIn * 1000

  while (Date.now() < deadline) {
    await sleep(interval * 1000, signal)
    const r = await post<{ access_token?: string; error?: string; error_description?: string }>(
      'https://github.com/login/oauth/access_token',
      {
        client_id: CLIENT_ID,
        device_code: start.deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      }
    )
    if (r.access_token) return r.access_token
    switch (r.error) {
      case 'authorization_pending':
        continue
      case 'slow_down':
        interval += 5
        continue
      case 'access_denied':
        throw new Error('Cancelaste la autorización en GitHub.')
      case 'expired_token':
        throw new Error('El código expiró. Inténtalo de nuevo.')
      default:
        throw new Error(r.error_description || r.error || 'Error de GitHub al iniciar sesión.')
    }
  }
  throw new Error('El código expiró. Inténtalo de nuevo.')
}
