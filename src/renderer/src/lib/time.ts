import type { Lang } from '@shared/i18n'
import { getLang } from '../i18n'

const formatters = new Map<Lang, Intl.RelativeTimeFormat>()
const formatter = (lang: Lang): Intl.RelativeTimeFormat => {
  let f = formatters.get(lang)
  if (!f) {
    f = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
    formatters.set(lang, f)
  }
  return f
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60]
]

/** "hace 3 días" / "3 days ago", in the language of the app. Input is an ISO date. */
export function timeAgo(iso: string): string {
  const lang = getLang()
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000
  for (const [unit, size] of UNITS) {
    if (seconds >= size) return formatter(lang).format(-Math.floor(seconds / size), unit)
  }
  return lang === 'es' ? 'hace un momento' : 'just now'
}
