import type { Entry } from '../i18n'

/** Pull requests: create dialog, list, detail, review and merge. */
export const prs = {
  'pr.createTitle': { es: 'Crear pull request', en: 'Create pull request' },
  'pr.creating': { es: 'Creando…', en: 'Creating…' },
  'pr.createDraft': { es: 'Crear borrador', en: 'Create draft' },
  'pr.targetBranch': { es: 'Rama destino', en: 'Target branch' },
  'pr.noNewCommits': {
    es: 'La rama {head} no tiene commits que {base} no tenga todavía.',
    en: 'The branch {head} has no commits that {base} does not have yet.'
  },
  'pr.newCommits': {
    es: '{n} {n?commit|commits} de {head} no {n?está|están} en {base}.',
    en: '{n} {n?commit|commits} from {head} {n?is|are} not in {base}.'
  },
  'pr.unpushed': {
    es: 'Tienes {n} {n?commit|commits} sin subir. Haz Push primero para incluirlos.',
    en: 'You have {n} unpushed {n?commit|commits}. Push first to include {n?it|them}.'
  },
  'pr.title': { es: 'Título', en: 'Title' },
  'pr.description': { es: 'Descripción (opcional)', en: 'Description (optional)' },
  'pr.asDraft': { es: 'Crear como borrador', en: 'Create as draft' },

  'pr.onlyGithub': {
    es: 'Los pull requests solo están disponibles para proyectos de GitHub.',
    en: 'Pull requests are only available for GitHub projects.'
  },
  'pr.publishFirst': {
    es: 'Publica el proyecto en GitHub para ver sus pull requests.',
    en: 'Publish the project on GitHub to see its pull requests.'
  },
  'pr.filterOpen': { es: 'Abiertos', en: 'Open' },
  'pr.filterClosed': { es: 'Cerrados', en: 'Closed' },
  'pr.filterAll': { es: 'Todos', en: 'All' },
  'pr.refresh': { es: 'Actualizar', en: 'Refresh' },
  'pr.loadingList': { es: 'Cargando pull requests…', en: 'Loading pull requests…' },
  'pr.emptyList': {
    es: 'No hay pull requests en esta vista.',
    en: 'There are no pull requests in this view.'
  },
  'pr.pickOne': {
    es: 'Elige un pull request para ver el detalle.',
    en: 'Choose a pull request to see its details.'
  },
  'pr.stateOpen': { es: 'Abierto', en: 'Open' },
  'pr.stateClosed': { es: 'Cerrado', en: 'Closed' },
  'pr.stateMerged': { es: 'Merged', en: 'Merged' },
  'pr.draft': { es: 'Borrador', en: 'Draft' },
  'pr.reviewApproved': { es: 'Aprobó', en: 'Approved' },
  'pr.reviewChanges': { es: 'Pidió cambios', en: 'Requested changes' },
  'pr.reviewCommented': { es: 'Comentó', en: 'Commented' },
  'pr.reviewDismissed': { es: 'Revisión descartada', en: 'Review dismissed' },
  'pr.tabSummary': { es: 'Resumen', en: 'Summary' },
  'pr.tabFiles': { es: 'Archivos', en: 'Files' },
  'pr.tabConversation': { es: 'Conversación', en: 'Conversation' },
  'pr.statComments': { es: '{n} {n?comentario|comentarios}', en: '{n} {n?comment|comments}' },
  'pr.noDescription': { es: 'Sin descripción.', en: 'No description.' },
  'pr.loadingFiles': { es: 'Cargando archivos…', en: 'Loading files…' },
  'pr.noFiles': { es: 'No hay archivos que mostrar.', en: 'There are no files to show.' },
  'pr.binary': {
    es: 'Archivo binario o demasiado grande. Ábrelo en GitHub para verlo.',
    en: 'Binary or very large file. Open it on GitHub to see it.'
  },
  'pr.loadingConversation': { es: 'Cargando conversación…', en: 'Loading conversation…' },
  'pr.noConversation': {
    es: 'Aún no hay comentarios ni revisiones.',
    en: 'There are no comments or reviews yet.'
  },
  'pr.ownPr': {
    es: 'Este PR es tuyo: solo puedes comentar.',
    en: 'This PR is yours: you can only comment.'
  },
  'pr.reviewingAs': { es: 'Revisando como {login}', en: 'Reviewing as {login}' },
  'pr.review': { es: 'Revisar', en: 'Review' },
  'pr.merge': { es: 'Merge…', en: 'Merge…' },

  'rv.title': { es: 'Revisar #{n}', en: 'Review #{n}' },
  'rv.send': { es: 'Enviar revisión', en: 'Send review' },
  'rv.sending': { es: 'Enviando…', en: 'Sending…' },
  'rv.placeholderRequired': { es: 'Escribe tu comentario', en: 'Write your comment' },
  'rv.placeholderOptional': { es: 'Comentario (opcional)', en: 'Comment (optional)' },
  'rv.comment': { es: 'Comentar', en: 'Comment' },
  'rv.commentHint': {
    es: 'Deja un comentario sin aprobar ni bloquear.',
    en: 'Leave a comment without approving or blocking.'
  },
  'rv.approve': { es: 'Aprobar', en: 'Approve' },
  'rv.approveHint': { es: 'Aprueba estos cambios.', en: 'Approve these changes.' },
  'rv.request': { es: 'Solicitar cambios', en: 'Request changes' },
  'rv.requestHint': {
    es: 'Pide cambios antes de poder hacer merge.',
    en: 'Ask for changes before it can be merged.'
  },
  'rv.ownBlocked': {
    es: 'GitHub no deja hacerlo en tu propio pull request.',
    en: 'GitHub does not allow this on your own pull request.'
  },
  'rv.doneComment': { es: 'Comentario enviado', en: 'Comment sent' },
  'rv.doneApprove': { es: 'Pull request aprobado', en: 'Pull request approved' },
  'rv.doneRequest': { es: 'Cambios solicitados', en: 'Changes requested' },

  'mg.title': { es: 'Merge del PR #{n}', en: 'Merge PR #{n}' },
  'mg.busy': { es: 'Haciendo merge…', en: 'Merging…' },
  'mg.button': { es: 'Hacer merge ({method})', en: 'Merge ({method})' },
  'mg.intro': {
    es: 'Se hará merge de <b>{head}</b> en <b>{base}</b>. Esto es visible para tu equipo y no se puede deshacer desde GitDog.',
    en: '<b>{head}</b> will be merged into <b>{base}</b>. This is visible to your team and cannot be undone from GitDog.'
  },
  'mg.mergeCommit': { es: 'Merge commit', en: 'Merge commit' },
  'mg.mergeCommitHint': {
    es: 'Conserva todos los commits y añade un commit de merge.',
    en: 'Keeps all the commits and adds a merge commit.'
  },
  'mg.squash': { es: 'Squash', en: 'Squash' },
  'mg.squashHint': { es: 'Junta todos los commits en uno solo.', en: 'Combines all the commits into one.' },
  'mg.rebase': { es: 'Rebase', en: 'Rebase' },
  'mg.rebaseHint': {
    es: 'Reaplica los commits sobre la rama destino, sin commit de merge.',
    en: 'Replays the commits on top of the target branch, without a merge commit.'
  },
  'mg.warnDirty': {
    es: 'Hay conflictos con la rama destino. Resuélvelos antes de hacer merge.',
    en: 'There are conflicts with the target branch. Resolve them before merging.'
  },
  'mg.warnBlocked': {
    es: 'GitHub indica reglas pendientes, por ejemplo revisiones obligatorias o checks. Si no tienes permiso, GitHub rechazará el merge.',
    en: 'GitHub reports pending rules, such as required reviews or checks. If you do not have permission, GitHub will reject the merge.'
  },
  'mg.warnBehind': {
    es: 'La rama está desactualizada respecto a la destino.',
    en: 'The branch is out of date with the target branch.'
  },
  'mg.warnUnstable': { es: 'Hay checks que fallan.', en: 'Some checks are failing.' },
  'mg.warnDraft': {
    es: 'Es un borrador. Márcalo como listo en GitHub antes de hacer merge.',
    en: 'It is a draft. Mark it as ready on GitHub before merging.'
  },
  'mg.emailTitle': { es: 'Correo del commit de merge', en: 'Merge commit email' },
  'mg.emailLoading': { es: 'Buscando tus correos…', en: 'Looking for your emails…' },
  'mg.emailPrivate': { es: 'Correo privado de GitHub', en: 'GitHub private email' },
  'mg.emailPrimary': { es: 'Correo principal', en: 'Primary email' },
  'mg.emailVerified': { es: 'Correo verificado', en: 'Verified email' },
  'mg.emailDefault': { es: 'El predeterminado de GitHub', en: 'GitHub default' },
  'mg.emailDefaultHint': {
    es: 'GitHub usa el correo principal de tu cuenta. Puede ser el del trabajo.',
    en: 'GitHub uses the primary email of your account. It may be your work email.'
  },
  'mg.emailLimited': {
    es: 'Para elegir entre más correos, el token necesita el permiso user:email.',
    en: 'To choose between more emails, the token needs the user:email permission.'
  },
  'mg.deleteBranch': {
    es: 'Borrar la rama <code>{head}</code> en GitHub después',
    en: 'Delete the branch <code>{head}</code> on GitHub afterwards'
  }
} satisfies Record<string, Entry>
