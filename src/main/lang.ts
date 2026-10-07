import type { Lang, Params } from '../shared/i18n'
import { translate, type MessageKey } from '../shared/messages'

// The window tells the main process which language the user picked, so errors come in that language.
let current: Lang = 'es'

export const setLang = (lang: Lang): void => {
  current = lang
}

export const t = (key: MessageKey, params?: Params): string => translate(current, key, params)
