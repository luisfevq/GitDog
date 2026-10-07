import type { Entry } from '../i18n'

/** Tags, history, diffs and the progress of git operations. */
export const repo = {
  'tg.namePlaceholder': { es: 'Nombre del tag, por ejemplo v1.0.0', en: 'Tag name, for example v1.0.0' },
  'tg.create': { es: 'Crear tag', en: 'Create tag' },
  'tg.messagePlaceholder': {
    es: 'Mensaje (opcional). Con mensaje se crea un tag anotado.',
    en: 'Message (optional). With a message, an annotated tag is created.'
  },
  'tg.pushOnCreate': { es: 'Subir a GitHub al crearlo', en: 'Push to GitHub when created' },
  'tg.at': {
    es: 'El tag se crea en el último commit de la rama actual.',
    en: 'The tag is created on the latest commit of the current branch.'
  },
  'tg.needCommit': { es: 'Haz un commit antes de crear un tag.', en: 'Make a commit before creating a tag.' },
  'tg.needRemote': {
    es: 'Publica el proyecto para poder subir tags a GitHub.',
    en: 'Publish the project to be able to push tags to GitHub.'
  },
  'tg.loading': { es: 'Leyendo tags…', en: 'Reading tags…' },
  'tg.empty': { es: 'Este proyecto aún no tiene tags.', en: 'This project has no tags yet.' },
  'tg.onGithub': { es: 'En GitHub', en: 'On GitHub' },
  'tg.localOnly': { es: 'Solo local', en: 'Local only' },
  'tg.annotated': { es: 'Anotado', en: 'Annotated' },
  'tg.viewRelease': { es: 'Ver release en GitHub', en: 'View release on GitHub' },
  'tg.push': { es: 'Subir', en: 'Push' },
  'tg.delete': { es: 'Eliminar', en: 'Delete' },
  'tg.created': { es: 'Tag {name} creado', en: 'Tag {name} created' },
  'tg.pushed': { es: 'Tag {name} subido', en: 'Tag {name} pushed' },
  'tg.deleted': { es: 'Tag {name} eliminado', en: 'Tag {name} deleted' },
  'tg.deleteTitle': { es: 'Eliminar el tag {name}', en: 'Delete the tag {name}' },
  'tg.deleteBody': {
    es: 'El tag se borra de esta carpeta. Los commits no se tocan.',
    en: 'The tag is deleted from this folder. The commits are not touched.'
  },
  'tg.deleteRemote': { es: 'Borrarlo también en GitHub', en: 'Also delete it on GitHub' },

  'hs.reading': { es: 'Leyendo historial…', en: 'Reading history…' },
  'hs.empty': { es: 'Aún no hay commits.', en: 'There are no commits yet.' },
  'hs.pendingGroup': { es: 'Pendiente de subir · {n}', en: 'Waiting to push · {n}' },
  'hs.pushedGroup': { es: 'Ya en GitHub', en: 'Already on GitHub' },
  'hs.pending': { es: 'Pendiente de subir', en: 'Waiting to push' },
  'hs.hashCopied': { es: 'Hash copiado', en: 'Hash copied' },
  'hs.noChanges': { es: 'Este commit no cambia archivos.', en: 'This commit changes no files.' },

  'df.empty': { es: 'Sin diferencias que mostrar.', en: 'No differences to show.' },
  'df.error': { es: 'No se pudo leer el diff:\n{reason}', en: 'Could not read the diff:\n{reason}' },

  'pg.preparing': { es: 'Preparando', en: 'Preparing' },
  'pg.counting': { es: 'Contando objetos', en: 'Counting objects' },
  'pg.compressing': { es: 'Comprimiendo', en: 'Compressing' },
  'pg.writing': { es: 'Subiendo', en: 'Uploading' },
  'pg.receiving': { es: 'Descargando', en: 'Downloading' },
  'pg.resolving': { es: 'Resolviendo cambios', en: 'Resolving changes' },
  'pg.verifying': { es: 'Verificando', en: 'Verifying' }
} satisfies Record<string, Entry>
