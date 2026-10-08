import { format, type Lang, type Params } from './i18n'
import { accounts } from './locales/accounts'
import { app } from './locales/app'
import { branches } from './locales/branches'
import { prs } from './locales/prs'
import { repo } from './locales/repo'
import { repoview } from './locales/repoview'
import { commits } from './locales/commits'
import { common } from './locales/common'
import { err } from './locales/err'

/** Every message of the app. Each area lives in its own file under locales/. */
export const messages = {
  ...common,
  ...app,
  ...accounts,
  ...branches,
  ...commits,
  ...prs,
  ...repo,
  ...repoview,
  ...err
}

export type MessageKey = keyof typeof messages

export function translate(lang: Lang, key: MessageKey, params?: Params): string {
  return format(messages[key][lang], params)
}
