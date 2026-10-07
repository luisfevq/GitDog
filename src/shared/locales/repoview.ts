import type { Entry } from '../i18n'

/** The main repository screen: toolbar, changes, commit box, banners and the file menu. */
export const repoview = {
  'rp.reading': { es: 'Leyendo repositorio…', en: 'Reading repository…' },
  'rp.refresh': { es: 'Actualizar', en: 'Refresh' },
  'rp.currentBranch': { es: 'Rama actual', en: 'Current branch' },

  'rp.publishProject': { es: 'Publicar en {login}', en: 'Publish to {login}' },
  'rp.publishProjectSub': { es: 'Este proyecto no está en GitHub', en: 'This project is not on GitHub' },
  'rp.commitFirst': { es: 'Haz un commit primero', en: 'Make a commit first' },
  'rp.publishBranch': { es: 'Publicar rama', en: 'Publish branch' },
  'rp.publishBranchSub': { es: 'Esta rama aún no está en GitHub', en: 'This branch is not on GitHub yet' },
  'rp.pullOrigin': { es: 'Pull origin', en: 'Pull origin' },
  'rp.pullSub': { es: '{n} {n?commit|commits} por bajar', en: '{n} {n?commit|commits} to pull' },
  'rp.pushOrigin': { es: 'Push origin', en: 'Push origin' },
  'rp.pushSub': { es: '{n} {n?commit|commits} por subir', en: '{n} {n?commit|commits} to push' },
  'rp.fetchOrigin': { es: 'Fetch origin', en: 'Fetch origin' },
  'rp.lastFetched': { es: 'Última actualización {time}', en: 'Last fetched {time}' },
  'rp.neverFetched': { es: 'Aún sin actualizar', en: 'Not fetched yet' },
  'rp.pushing': { es: 'Subiendo…', en: 'Pushing…' },
  'rp.pulling': { es: 'Bajando…', en: 'Pulling…' },
  'rp.fetching': { es: 'Buscando cambios…', en: 'Checking for changes…' },
  'rp.pushed': { es: 'Cambios subidos a GitHub', en: 'Changes pushed to GitHub' },
  'rp.upToDate': { es: 'Ya está al día', en: 'Already up to date' },
  'rp.pulledFiles': {
    es: 'Cambios descargados ({n} {n?archivo|archivos})',
    en: 'Changes pulled ({n} {n?file|files})'
  },
  'rp.pulled': { es: 'Cambios descargados', en: 'Changes pulled' },

  'rp.createPr': { es: 'Crear PR', en: 'Create PR' },
  'rp.createPrSub': { es: 'Abrir un pull request', en: 'Open a pull request' },
  'rp.createdPr': { es: 'Pull request #{n} creado', en: 'Pull request #{n} created' },
  'rp.prNumber': { es: 'PR #{n}', en: 'PR #{n}' },
  'rp.prNumberSub': { es: 'Pull request abierto', en: 'Open pull request' },

  'rp.savedChanges': {
    es: 'Dejaste cambios guardados en <b>{branch}</b>.',
    en: 'You left changes saved on <b>{branch}</b>.'
  },
  'rp.restore': { es: 'Restaurar cambios', en: 'Restore changes' },
  'rp.restored': { es: 'Cambios restaurados', en: 'Changes restored' },
  'rp.leftChanges': { es: 'Cambios guardados en la rama anterior', en: 'Changes saved on the previous branch' },
  'rp.branchCreated': { es: 'Rama {name} creada', en: 'Branch {name} created' },
  'rp.prExisting': {
    es: 'Subiste cambios a <b>{branch}</b>. Esta rama ya tiene el pull request <b>#{n}</b> abierto, y se actualizó solo.',
    en: 'You pushed changes to <b>{branch}</b>. This branch already has pull request <b>#{n}</b> open, and it updated by itself.'
  },
  'rp.viewPr': { es: 'Ver pull request', en: 'View pull request' },
  'rp.prOffer': {
    es: 'Subiste la rama <b>{branch}</b>. ¿Quieres abrir un pull request?',
    en: 'You pushed the branch <b>{branch}</b>. Do you want to open a pull request?'
  },

  'rp.tabChanges': { es: 'Cambios', en: 'Changes' },
  'rp.tabHistory': { es: 'Historial', en: 'History' },
  'rp.tabTags': { es: 'Tags', en: 'Tags' },
  'rp.tabPulls': { es: 'Pull requests', en: 'Pull requests' },
  'rp.pendingTitle': {
    es: '{n} {n?commit pendiente|commits pendientes} de subir',
    en: '{n} unpushed {n?commit|commits}'
  },

  'rp.changedFiles': {
    es: '{n} {n?archivo cambiado|archivos cambiados}',
    en: '{n} changed {n?file|files}'
  },
  'rp.noChanges': { es: 'No hay cambios. Todo está al día.', en: 'No changes. Everything is up to date.' },
  'rp.pickFile': { es: 'Elige un archivo para ver los cambios.', en: 'Choose a file to see its changes.' },

  'rp.commitPlaceholder': { es: 'Mensaje del commit', en: 'Commit message' },
  'rp.commitDefaultHint': {
    es: 'Si lo dejas vacío, se usa este mensaje',
    en: 'If you leave it empty, this message is used'
  },
  'rp.commitTo': { es: 'Commit en <b>{branch}</b>{count}', en: 'Commit to <b>{branch}</b>{count}' },
  'rp.committed': { es: 'Commit creado', en: 'Commit created' },
  'rp.lastCommit': { es: 'Último commit {time}', en: 'Committed {time}' },
  'rp.undo': { es: 'Deshacer', en: 'Undo' },
  'rp.undoTitle': {
    es: 'Deshacer el último commit y conservar sus cambios',
    en: 'Undo the last commit and keep its changes'
  },
  'rp.undone': {
    es: 'Commit deshecho. Los cambios volvieron a la lista.',
    en: 'Commit undone. The changes are back in the list.'
  },

  'rp.menuDiscard': { es: 'Descartar cambios…', en: 'Discard changes…' },
  'rp.menuDiscardAll': { es: 'Descartar todos los cambios ({n})…', en: 'Discard all changes ({n})…' },
  'rp.menuIgnoreFile': { es: 'Ignorar archivo (añadir a .gitignore)', en: 'Ignore file (add to .gitignore)' },
  'rp.menuIgnoreFolder': { es: 'Ignorar carpeta', en: 'Ignore folder' },
  'rp.menuIgnoreExt': { es: 'Ignorar todos los archivos {ext}', en: 'Ignore all {ext} files' },
  'rp.menuTracked': {
    es: 'El archivo ya está en Git. Para ignorarlo, déjalo de seguir antes.',
    en: 'The file is already tracked by Git. Stop tracking it before ignoring it.'
  },
  'rp.menuCopyPath': { es: 'Copiar ruta completa', en: 'Copy full path' },
  'rp.menuCopyRelative': { es: 'Copiar ruta relativa', en: 'Copy relative path' },
  'rp.menuReveal': { es: 'Mostrar en Finder', en: 'Show in Finder' },
  'rp.pathCopied': { es: 'Ruta copiada', en: 'Path copied' },
  'rp.ignored': { es: 'Añadido a .gitignore: {pattern}', en: 'Added to .gitignore: {pattern}' },

  'rp.discardTitle': { es: 'Descartar cambios', en: 'Discard changes' },
  'rp.discardOne': {
    es: '¿Descartar los cambios de <b>{name}</b>? El archivo vuelve a su último commit. Una copia queda en la Papelera.',
    en: 'Discard the changes to <b>{name}</b>? The file goes back to its last commit. A copy stays in the Trash.'
  },
  'rp.discardMany': {
    es: '¿Descartar los cambios de {n} archivos? Cada archivo vuelve a su último commit. Una copia queda en la Papelera.',
    en: 'Discard the changes to {n} files? Each file goes back to its last commit. A copy stays in the Trash.'
  },
  'rp.discardConfirm': { es: 'Descartar', en: 'Discard' },
  'rp.discarded': {
    es: 'Cambios descartados. Hay una copia en la Papelera.',
    en: 'Changes discarded. A copy is in the Trash.'
  }
} satisfies Record<string, Entry>
