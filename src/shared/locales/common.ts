import type { Entry } from '../i18n'

export const common = {
  'common.cancel': { es: 'Cancelar', en: 'Cancel' },
  'common.close': { es: 'Cerrar', en: 'Close' },
  'common.remove': { es: 'Quitar', en: 'Remove' },
  'common.copy': { es: 'Copiar', en: 'Copy' },
  'common.loading': { es: 'Cargando…', en: 'Loading…' },
  'common.noResults': { es: 'Sin resultados.', en: 'No results.' },
  'common.commits': { es: '{n} {n?commit|commits}', en: '{n} {n?commit|commits}' },
  'common.files': { es: '{n} {n?archivo|archivos}', en: '{n} {n?file|files}' },
  'common.language': { es: 'Idioma', en: 'Language' }
} satisfies Record<string, Entry>
