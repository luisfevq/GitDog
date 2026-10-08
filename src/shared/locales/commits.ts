import type { Entry } from '../i18n'

/** Right-click menu of a commit, its dialogs, and the update check. */
export const commits = {
  'cm.amend': { es: 'Modificar commit…', en: 'Amend commit…' },
  'cm.undo': { es: 'Deshacer commit', en: 'Undo commit' },
  'cm.branch': { es: 'Crear rama desde este commit…', en: 'Create branch from commit…' },
  'cm.tag': { es: 'Crear tag…', en: 'Create tag…' },
  'cm.copySha': { es: 'Copiar SHA', en: 'Copy SHA' },
  'cm.shaCopied': { es: 'SHA copiado', en: 'SHA copied' },
  'cm.onlyLast': {
    es: 'Solo se puede en el último commit de la rama.',
    en: 'Only possible on the latest commit of the branch.'
  },
  'cm.alreadyPushed': { es: 'El commit ya está en GitHub.', en: 'The commit is already on GitHub.' },
  'cm.cannotUndo': {
    es: 'No se puede deshacer un commit de merge ni el primero del proyecto.',
    en: 'A merge commit or the first commit of a project cannot be undone.'
  },

  'cm.amendTitle': { es: 'Modificar el último commit', en: 'Amend the last commit' },
  'cm.amendMessage': { es: 'Mensaje', en: 'Message' },
  'cm.amendInclude': {
    es: 'Incluir {n} {n?archivo marcado|archivos marcados} en este commit',
    en: 'Include {n} staged {n?file|files} in this commit'
  },
  'cm.amendHint': {
    es: 'El commit se reescribe. Como todavía no se subió, no afecta a nadie más.',
    en: 'The commit is rewritten. Since it has not been pushed yet, it does not affect anyone else.'
  },
  'cm.amendButton': { es: 'Modificar commit', en: 'Amend commit' },
  'cm.amended': { es: 'Commit modificado', en: 'Commit amended' },

  'cm.branchTitle': { es: 'Nueva rama desde {sha}', en: 'New branch from {sha}' },
  'cm.tagTitle': { es: 'Crear tag en {sha}', en: 'Create tag on {sha}' },

  'upd.check': { es: 'Buscar actualizaciones', en: 'Check for updates' },
  'upd.checking': { es: 'Buscando…', en: 'Checking…' },
  'upd.version': { es: 'GitDog {version}', en: 'GitDog {version}' },
  'upd.upToDate': { es: 'Tienes la última versión ({version}).', en: 'You have the latest version ({version}).' },
  'upd.failed': {
    es: 'No se pudo comprobar. Revisa tu conexión.',
    en: 'Could not check. Check your connection.'
  },
  'upd.unsupported': {
    es: 'Las versiones nuevas son solo para Apple Silicon. Este Mac se queda en la {version}.',
    en: 'New versions are for Apple Silicon only. This Mac stays on {version}.'
  },
  'upd.found': { es: 'Hay una versión nueva: {version}', en: 'A new version is available: {version}' }
} satisfies Record<string, Entry>
