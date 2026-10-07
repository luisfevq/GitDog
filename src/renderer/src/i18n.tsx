import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { detectLang, format, type Lang, type Params } from '@shared/i18n'
import { translate, type MessageKey } from '@shared/messages'

const STORAGE_KEY = 'gitdog.lang'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'es' || saved === 'en') return saved
  } catch {
    /* storage not available: use the system language */
  }
  return detectLang(navigator.language)
}

// Helpers outside React (like timeAgo) read the language from here. The provider keeps it up to date.
let activeLang: Lang = initialLang()
export const getLang = (): Lang => activeLang

interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  /** Plain text */
  t: (key: MessageKey, params?: Params) => string
  /** Text with <b>bold</b> and <code>code</code> parts, as React nodes */
  tr: (key: MessageKey, params?: Params) => ReactNode
}

const I18nContext = createContext<I18n | null>(null)

/** Splits a message into plain, <b> and <code> parts. Parameters are filled in after splitting, so they cannot add tags. */
function rich(template: string, params: Params): ReactNode {
  return template.split(/(<b>.*?<\/b>|<code>.*?<\/code>)/g).map((part, i) => {
    const tag = part.match(/^<(b|code)>(.*)<\/\1>$/)
    if (!tag) return <Fragment key={i}>{format(part, params)}</Fragment>
    const Tag = tag[1] as 'b' | 'code'
    return <Tag key={i}>{format(tag[2], params)}</Tag>
  })
}

export function I18nProvider({ children }: { children: ReactNode }): JSX.Element {
  const [lang, setLangState] = useState<Lang>(initialLang)
  activeLang = lang

  useEffect(() => {
    document.documentElement.lang = lang
    // The main process writes its own messages (errors), so it needs to know the language too.
    void window.api.setLanguage(lang).catch(() => undefined)
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* the choice is just not remembered */
    }
    setLangState(next)
  }, [])

  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang,
      t: (key, params) => translate(lang, key, params),
      tr: (key, params = {}) => rich(translate(lang, key), params)
    }),
    [lang, setLang]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n needs an I18nProvider')
  return value
}
