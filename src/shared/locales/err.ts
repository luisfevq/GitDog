import type { Entry } from '../i18n'

/** Messages written by the main process: errors and short results. */
export const err = {
  'err.oauthOff': { es: 'El login por navegador no está configurado.', en: 'Browser sign-in is not set up.' },
  'err.oauthDeviceOff': {
    es: 'Activa "Device Flow" en la OAuth App de GitHub.',
    en: 'Turn on "Device Flow" in the GitHub OAuth App.'
  },
  'err.oauthStart': {
    es: 'GitHub no pudo iniciar el login ({reason}).',
    en: 'GitHub could not start the sign-in ({reason}).'
  },
  'err.noReply': { es: 'sin respuesta', en: 'no reply' },
  'err.loginCancelled': { es: 'Inicio de sesión cancelado.', en: 'Sign-in cancelled.' },
  'err.authDenied': { es: 'Cancelaste la autorización en GitHub.', en: 'You cancelled the authorization on GitHub.' },
  'err.codeExpired': { es: 'El código expiró. Inténtalo de nuevo.', en: 'The code expired. Try again.' },
  'err.githubLogin': { es: 'Error de GitHub al iniciar sesión.', en: 'GitHub error while signing in.' },

  'err.noAccount': { es: 'La cuenta {login} no existe.', en: 'The account {login} does not exist.' },
  'err.noProject': { es: 'El proyecto ya no existe.', en: 'The project no longer exists.' },
  'err.noFolder': { es: 'La carpeta ya no existe: {path}', en: 'The folder no longer exists: {path}' },
  'err.dupFolder': {
    es: 'Esta carpeta ya está en la cuenta {login}.',
    en: 'This folder is already in the account {login}.'
  },
  'err.noGithubRemote': {
    es: 'Este proyecto no tiene un remoto de GitHub. Publícalo primero.',
    en: 'This project has no GitHub remote. Publish it first.'
  },
  'err.tagName': {
    es: 'Nombre de tag no válido. Usa letras, números, punto, guion o barra. Ejemplo: v1.0.0',
    en: 'Invalid tag name. Use letters, numbers, dot, dash or slash. Example: v1.0.0'
  },
  'err.prNumber': { es: 'Número de pull request no válido.', en: 'Invalid pull request number.' },
  'err.connectFirst': { es: 'Primero conecta una cuenta de GitHub.', en: 'Connect a GitHub account first.' },
  'err.loginFirst': { es: 'Inicia el login primero.', en: 'Start the sign-in first.' },
  'err.pickFolder': { es: 'Elige una carpeta.', en: 'Choose a folder.' },
  'err.notRepo': { es: 'Esta carpeta no es un repositorio Git.', en: 'This folder is not a Git repository.' },
  'err.destExists': {
    es: 'Ya existe una carpeta llamada "{name}" en ese lugar.',
    en: 'A folder named "{name}" already exists there.'
  },
  'err.hasRemote': { es: 'Este proyecto ya tiene un remoto.', en: 'This project already has a remote.' },
  'err.commitFirstPublish': {
    es: 'Haz al menos un commit antes de publicar.',
    en: 'Make at least one commit before publishing.'
  },
  'err.commitMessage': { es: 'Escribe un mensaje de commit.', en: 'Write a commit message.' },
  'err.branchName': {
    es: 'Nombre de rama no válido. No uses espacios ni caracteres especiales.',
    en: 'Invalid branch name. Do not use spaces or special characters.'
  },
  'err.badRef': { es: 'Referencia no válida.', en: 'Invalid reference.' },
  'err.badCommit': { es: 'Commit no válido.', en: 'Invalid commit.' },
  'err.mergeSelf': {
    es: 'No puedes hacer merge de una rama en sí misma.',
    en: 'You cannot merge a branch into itself.'
  },
  'msg.mergeUpToDate': {
    es: '{current} ya tiene todo lo de {branch}.',
    en: '{current} already has everything from {branch}.'
  },
  'msg.mergeBranchDone': {
    es: 'Merge de {branch} en {current} completado ({n} {n?commit|commits}).',
    en: 'Merged {branch} into {current} ({n} {n?commit|commits}).'
  },
  'msg.mergeContinued': { es: 'Merge completado.', en: 'Merge completed.' },
  'err.noMerge': { es: 'No hay ningún merge en curso.', en: 'There is no merge in progress.' },
  'err.mergeUnresolved': {
    es: 'Aún hay conflictos sin resolver en: {files}.',
    en: 'There are still unresolved conflicts in: {files}.'
  },
  'err.commitFirstTag': {
    es: 'Haz al menos un commit antes de crear un tag.',
    en: 'Make at least one commit before creating a tag.'
  },
  'err.tagNotPushed': {
    es: 'El tag se creó, pero no se pudo subir: {reason}',
    en: 'The tag was created, but it could not be pushed: {reason}'
  },
  'err.noBranch': { es: 'No hay una rama activa.', en: 'There is no active branch.' },
  'err.pushBranchFirst': {
    es: 'Sube la rama a GitHub (Push) antes de crear el pull request.',
    en: 'Push the branch to GitHub before creating the pull request.'
  },
  'err.prTitle': { es: 'Escribe un título.', en: 'Write a title.' },
  'err.prBase': { es: 'Elige la rama destino.', en: 'Choose the target branch.' },
  'err.prSameBranch': {
    es: 'La rama del PR y la rama destino son la misma.',
    en: 'The PR branch and the target branch are the same.'
  },
  'err.reviewType': { es: 'Tipo de revisión no válido.', en: 'Invalid review type.' },
  'err.reviewComment': {
    es: 'Escribe un comentario para esta revisión.',
    en: 'Write a comment for this review.'
  },
  'err.mergeMethod': { es: 'Método de merge no válido.', en: 'Invalid merge method.' },
  'err.prClosed': { es: 'Este pull request ya no está abierto.', en: 'This pull request is no longer open.' },
  'err.prDraft': {
    es: 'Es un borrador. Márcalo como listo en GitHub antes de hacer merge.',
    en: 'It is a draft. Mark it as ready on GitHub before merging.'
  },
  'err.badEmail': { es: 'Correo no válido.', en: 'Invalid email.' },
  'msg.prMerged': {
    es: 'Merge del pull request #{n} completado.{note}',
    en: 'Pull request #{n} merged.{note}'
  },
  'msg.branchDeleteFailed': {
    es: ' No se pudo borrar la rama: {reason}',
    en: ' The branch could not be deleted: {reason}'
  },
  'err.badUrl': { es: 'URL no permitida.', en: 'URL not allowed.' },

  'err.gitUnknown': { es: 'Error desconocido de git', en: 'Unknown git error' },
  'err.tokenInvalid': { es: 'Token inválido o expirado.', en: 'Invalid or expired token.' },
  'err.noPermission': {
    es: 'Sin permisos. Revisa que el token tenga el permiso "repo".',
    en: 'No permission. Check that the token has the "repo" permission.'
  },
  'err.githubStatus': { es: 'GitHub respondió {status}{detail}', en: 'GitHub replied {status}{detail}' },
  'err.githubReplied': { es: 'respondió {status}', en: 'replied {status}' },
  'err.githubMergeFailed': {
    es: 'GitHub no pudo hacer el merge del pull request.',
    en: 'GitHub could not merge the pull request.'
  },
  'err.keychain': {
    es: 'El Keychain de macOS no está disponible. No se puede guardar el token.',
    en: 'The macOS Keychain is not available. The token cannot be saved.'
  },
  'err.noToken': {
    es: 'No hay token para la cuenta {login}. Vuelve a iniciar sesión.',
    en: 'There is no token for the account {login}. Sign in again.'
  },

  'err.undoPushed': {
    es: 'Solo puedes deshacer un commit que todavía no se subió.',
    en: 'You can only undo a commit that has not been pushed yet.'
  },
  'err.undoNotAllowed': {
    es: 'No se puede deshacer un commit de merge ni el primer commit del proyecto.',
    en: 'A merge commit or the first commit of a project cannot be undone.'
  },
  'err.amendPushed': {
    es: 'Solo puedes modificar un commit que todavía no se subió.',
    en: 'You can only amend a commit that has not been pushed yet.'
  },
  'err.releaseTag': { es: 'Escribe el tag del release.', en: 'Write the tag of the release.' },
  'err.releaseFile': {
    es: 'Archivo no permitido. Elígelo con "Añadir archivos…".',
    en: 'File not allowed. Pick it with "Add files…".'
  },
  'err.releaseTooBig': {
    es: 'El archivo {name} pesa más de 2 GB, el máximo de GitHub.',
    en: 'The file {name} is larger than 2 GB, the GitHub maximum.'
  },
  'err.releaseExists': {
    es: 'Ya existe un release para el tag {tag}.',
    en: 'A release for the tag {tag} already exists.'
  },
  'err.releaseUpload': {
    es: 'No se pudo subir {name}: {reason}. No se creó el release.',
    en: 'Could not upload {name}: {reason}. The release was not created.'
  },
  'err.releasePublish': {
    es: 'Los archivos se subieron, pero no se pudo publicar: {reason}. El release quedó como borrador en GitHub.',
    en: 'The files were uploaded, but publishing failed: {reason}. The release was left as a draft on GitHub.'
  },
  'err.badPattern': { es: 'Patrón no válido.', en: 'Invalid pattern.' },
  'err.noFilesToDiscard': { es: 'No hay archivos que descartar.', en: 'There are no files to discard.' }
} satisfies Record<string, Entry>
