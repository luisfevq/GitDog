import type { Entry } from '../i18n'

/** Create a GitHub release from the Tags tab. */
export const release = {
  'rl.button': { es: 'Crear release…', en: 'Create release…' },
  'rl.rowButton': { es: 'Release', en: 'Release' },
  'rl.title': { es: 'Crear release', en: 'Create release' },
  'rl.tag': { es: 'Tag', en: 'Tag' },
  'rl.tagPlaceholder': { es: 'v1.0.0', en: 'v1.0.0' },
  'rl.tagLocal': {
    es: 'Este tag solo está en tu Mac (commit <code>{hash}</code>). Se subirá a GitHub al crear el release.',
    en: 'This tag is only on your Mac (commit <code>{hash}</code>). It will be pushed to GitHub when the release is created.'
  },
  'rl.tagNew': {
    es: 'Ese tag no existe todavía. GitHub lo creará en el último commit de <b>{default}</b> en GitHub, no en tu rama local.',
    en: 'That tag does not exist yet. GitHub will create it on the latest commit of <b>{default}</b> on GitHub, not on your local branch.'
  },
  'rl.warnOffDefault': {
    es: 'Estás en <b>{branch}</b>, no en <b>{default}</b>. Lo que solo esté en tu rama no entra en el release.',
    en: 'You are on <b>{branch}</b>, not on <b>{default}</b>. What is only on your branch will not be in the release.'
  },
  'rl.warnUnpushed': {
    es: 'Tienes {n} {n?commit|commits} sin subir. No entrarán en el release hasta que los subas y los lleves a la rama principal.',
    en: 'You have {n} unpushed {n?commit|commits}. They will not be in the release until you push them and bring them to the default branch.'
  },
  'rl.onlyFiles': { es: 'Solo se pueden añadir archivos, no carpetas.', en: 'Only files can be added, not folders.' },
  'rl.drop': { es: 'Suelta aquí los archivos', en: 'Drop the files here' },
  'rl.dropHint': {
    es: 'Arrastra aquí los archivos, o usa "Añadir archivos…"',
    en: 'Drag the files here, or use "Add files…"'
  },
  'rl.defaultBranch': { es: 'la rama principal', en: 'the default branch' },
  'rl.name': { es: 'Título', en: 'Title' },
  'rl.namePlaceholder': { es: 'Título del release', en: 'Release title' },
  'rl.nameDefaultHint': {
    es: 'Si lo dejas vacío, se usa este título',
    en: 'If you leave it empty, this title is used'
  },
  'rl.notes': { es: 'Notas', en: 'Notes' },
  'rl.notesPlaceholder': { es: 'Qué cambia en esta versión…', en: 'What changes in this version…' },
  'rl.generate': {
    es: 'Añadir las notas automáticas de GitHub',
    en: "Add GitHub's automatic notes"
  },
  'rl.files': { es: 'Archivos', en: 'Files' },
  'rl.addFiles': { es: 'Añadir archivos…', en: 'Add files…' },
  'rl.draft': { es: 'Guardar como borrador (sin publicar)', en: 'Save as draft (do not publish)' },
  'rl.prerelease': { es: 'Marcar como pre-release', en: 'Mark as pre-release' },
  'rl.visibleHint': {
    es: 'Un release publicado lo ve todo el que pueda ver el repositorio.',
    en: 'A published release is visible to everyone who can see the repository.'
  },
  'rl.publish': { es: 'Publicar release', en: 'Publish release' },
  'rl.saveDraft': { es: 'Guardar borrador', en: 'Save draft' },
  'rl.working': { es: 'Publicando…', en: 'Publishing…' },
  'rl.donePublished': { es: 'Release publicado', en: 'Release published' },
  'rl.doneDraft': { es: 'Borrador guardado', en: 'Draft saved' },
  'rl.doneFiles': { es: '{n} {n?archivo subido|archivos subidos}', en: '{n} {n?file|files} uploaded' },
  'pg.asset': { es: 'Subiendo archivos', en: 'Uploading files' }
} satisfies Record<string, Entry>
