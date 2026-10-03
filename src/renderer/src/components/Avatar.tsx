import { useState } from 'react'
import type { Account } from '@shared/types'

interface Props {
  name: string
  email: string
  /** Account of the project: its commits show its real photo */
  account?: Account
  /** The author is the account's owner even if the email differs (same author name) */
  own?: boolean
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

/** True when the commit email is the account's own: its address or its private noreply one. */
export function isAccountEmail(email: string, account: Account): boolean {
  return email.toLowerCase() === account.email.toLowerCase() || githubId(email) === String(account.id)
}

export function Avatar({ name, email, account, own = false, size = 26 }: Props): JSX.Element {
  const [failed, setFailed] = useState(false)
  const id = githubId(email)
  const isAccount = !!account && (own || isAccountEmail(email, account))
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
