import type { Entry } from '../i18n'

/** The dialog that appears when a merge stops on conflicts. */
export const conflicts = {
  'cf.title': { es: 'Resuelve los conflictos antes del merge', en: 'Resolve conflicts before the merge' },
  'cf.subtitle': {
    es: 'Merge de <b>{branch}</b> en <b>{into}</b>',
    en: 'Merging <b>{branch}</b> into <b>{into}</b>'
  },
  'cf.allResolved': {
    es: 'Todos los archivos en conflicto están resueltos.',
    en: 'All conflicted files have been resolved.'
  },
  'cf.pending': {
    es: '{n} {n?archivo tiene|archivos tienen} conflictos. Ábrelos en tu editor, resuélvelos y vuelve aquí.',
    en: '{n} {n?file has|files have} conflicts. Open them in your editor, resolve them and come back here.'
  },
  'cf.count': { es: '{n} {n?archivo en conflicto|archivos en conflicto}', en: '{n} conflicted {n?file|files}' },
  'cf.fileRemaining': { es: 'Quedan conflictos', en: 'Conflicts remaining' },
  'cf.fileDone': { es: 'Sin conflictos pendientes', en: 'No conflicts remaining' },
  'cf.open': { es: 'Abrir', en: 'Open' },
  'cf.openTitle': {
    es: 'Abrir en tu editor (VS Code si está instalado)',
    en: 'Open in your editor (VS Code if installed)'
  },
  'cf.noteDeletedByThem': {
    es: 'En <b>{branch}</b> se borró este archivo. Se conserva tu versión, salvo que lo borres.',
    en: 'This file was deleted in <b>{branch}</b>. Your version is kept, unless you delete it.'
  },
  'cf.noteDeletedByUs': {
    es: 'En <b>{into}</b> se borró este archivo y <b>{branch}</b> lo modificó. Se conserva la versión de {branch}, salvo que lo borres.',
    en: 'This file was deleted in <b>{into}</b> and modified in <b>{branch}</b>. The version from {branch} is kept, unless you delete it.'
  },
  'cf.terminal': { es: 'Abrir en Terminal', en: 'Open in Terminal' },
  'cf.manual': {
    es: ', o cierra esta ventana para resolverlos con otra herramienta. El merge sigue abierto.',
    en: ', or close this window to resolve them with another tool. The merge stays open.'
  },
  'cf.abort': { es: 'Cancelar merge', en: 'Abort merge' },
  'cf.continue': { es: 'Continuar merge', en: 'Continue merge' },
  'cf.continuing': { es: 'Haciendo el commit…', en: 'Committing…' },
  'cf.abortTitle': { es: 'Cancelar el merge', en: 'Abort the merge' },
  'cf.abortBody': {
    es: 'Los archivos vuelven al estado de antes del merge. Lo que hayas resuelto se descarta.',
    en: 'Files go back to how they were before the merge. Anything you resolved is discarded.'
  },
  'cf.aborted': { es: 'Merge cancelado', en: 'Merge aborted' },
  'cf.banner': {
    es: 'Hay un merge sin terminar. Resuelve los conflictos para continuar, o cancélalo.',
    en: 'A merge is not finished. Resolve the conflicts to continue, or abort it.'
  },
  'cf.view': { es: 'Ver conflictos', en: 'View conflicts' }
} satisfies Record<string, Entry>
