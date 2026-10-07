export type Lang = 'es' | 'en'
export const LANGS: Lang[] = ['es', 'en']

/** One message in every language. Having both side by side means a missing translation fails the typecheck. */
export interface Entry {
  es: string
  en: string
}

export type Params = Record<string, string | number>

const PLURAL = /\{(\w+)\?([^|}]*)\|([^}]*)\}/g
const PLACEHOLDER = /\{(\w+)\}/g

/**
 * Fills a message template.
 * - {name} is replaced by the parameter.
 * - {n?one|other} picks "one" when n is 1 and "other" otherwise. Example: "{n} {n?commit|commits}".
 */
export function format(template: string, params: Params = {}): string {
  return template
    .replace(PLURAL, (_match, name: string, one: string, other: string) => (Number(params[name]) === 1 ? one : other))
    .replace(PLACEHOLDER, (match, name: string) => (name in params ? String(params[name]) : match))
}

export const detectLang = (locale: string | undefined): Lang => (locale?.toLowerCase().startsWith('es') ? 'es' : 'en')
