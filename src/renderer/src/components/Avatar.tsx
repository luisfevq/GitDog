import { useState } from 'react'
import type { Account } from '@shared/types'

interface Props {
  name: string
  email: string
  /** Account of the project: its commits show its real photo */
  account?: Account
  size?: number
}

/** GitHub noreply emails look like 12345+login@users.noreply.github.com and carry the user id. */
function githubId(email: string): string | null {
  return email.match(/^(\d+)\+[^@]+@users\.noreply\.github\.com$/i)?.[1] ?? null
}

function hue(text: string): number {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

export function Avatar({ name, email, account, size = 26 }: Props): JSX.Element {
  const [failed, setFailed] = useState(false)
  const id = githubId(email)
  const isAccount = !!account && (email.toLowerCase() === account.email.toLowerCase() || id === String(account.id))
  const src = isAccount ? account.avatarUrl : id ? `https://avatars.githubusercontent.com/u/${id}?s=64` : null

  if (src && !failed) {
    return <img className="avatar" style={{ width: size, height: size }} src={src} alt="" onError={() => setFailed(true)} />
  }
  return (
    <span
      className="avatar initials"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `hsl(${hue(email || name)} 45% 38%)` }}
      title={name}
    >
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  )
}
