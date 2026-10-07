import type { Entry } from '../i18n'

/** Sign-in, clone and publish dialogs. */
export const accounts = {
  'login.title': { es: 'Conectar cuenta de GitHub', en: 'Connect a GitHub account' },
  'login.connect': { es: 'Conectar', en: 'Connect' },
  'login.connecting': { es: 'Conectando…', en: 'Connecting…' },
  'login.connected': { es: 'Cuenta {login} conectada', en: 'Account {login} connected' },
  'login.browserIntro': {
    es: 'Se abrirá GitHub en tu navegador. Asegúrate de estar ahí con la cuenta que quieres agregar.',
    en: 'GitHub will open in your browser. Make sure you are signed in there with the account you want to add.'
  },
  'login.withGithub': { es: 'Iniciar sesión con GitHub', en: 'Sign in with GitHub' },
  'login.useToken': { es: 'Prefiero usar un token', en: 'I prefer to use a token' },
  'login.codeIntro': {
    es: 'Pega este código en GitHub para autorizar a GitDog. Ya lo copié por ti.',
    en: 'Paste this code on GitHub to authorise GitDog. I already copied it for you.'
  },
  'login.copyAgain': { es: 'Copiar de nuevo', en: 'Copy again' },
  'login.openGithub': { es: 'Abrir GitHub', en: 'Open GitHub' },
  'login.waiting': { es: 'Esperando autorización…', en: 'Waiting for authorisation…' },
  'login.cancelAttempt': { es: 'Cancelar este intento', en: 'Cancel this attempt' },
  'login.step1': {
    es: 'Abre <b>github.com</b> en el navegador y entra con la cuenta que quieres agregar.',
    en: 'Open <b>github.com</b> in your browser and sign in with the account you want to add.'
  },
  'login.step2': {
    es: 'Arriba a la derecha pulsa tu <b>foto de perfil</b> y elige <b>Settings</b>.',
    en: 'At the top right, click your <b>profile picture</b> and choose <b>Settings</b>.'
  },
  'login.step3': {
    es: 'En la barra izquierda, baja hasta el final y pulsa <b>Developer settings</b>.',
    en: 'In the left sidebar, scroll to the bottom and click <b>Developer settings</b>.'
  },
  'login.step4': {
    es: 'Pulsa <b>Personal access tokens</b> y luego <b>Tokens (classic)</b>.',
    en: 'Click <b>Personal access tokens</b>, then <b>Tokens (classic)</b>.'
  },
  'login.step5': {
    es: 'Pulsa <b>Generate new token</b> (arriba a la derecha) y elige <b>Generate new token (classic)</b>. GitHub puede pedirte la contraseña o el código 2FA.',
    en: 'Click <b>Generate new token</b> (top right) and choose <b>Generate new token (classic)</b>. GitHub may ask for your password or 2FA code.'
  },
  'login.step6': {
    es: 'En <b>Note</b> escribe <code>GitDog</code>. En <b>Expiration</b> elige <b>No expiration</b>. Marca la casilla <code>repo</code>.',
    en: 'In <b>Note</b> type <code>GitDog</code>. In <b>Expiration</b> choose <b>No expiration</b>. Tick the <code>repo</code> box.'
  },
  'login.step7': {
    es: 'Baja hasta el final y pulsa <b>Generate token</b>.',
    en: 'Scroll to the bottom and click <b>Generate token</b>.'
  },
  'login.step8': {
    es: 'Copia el texto que empieza con <code>ghp_</code>. GitHub lo muestra solo una vez. Pégalo en el campo de abajo.',
    en: 'Copy the text that starts with <code>ghp_</code>. GitHub shows it only once. Paste it in the field below.'
  },
  'login.shortcut': { es: 'Atajo: abrir la página del paso 6', en: 'Shortcut: open the page for step 6' },
  'login.shortcutHint': {
    es: 'El atajo salta los pasos 2 a 5 y deja <code>GitDog</code> y <code>repo</code> ya puestos. Revisa que sigues con la cuenta correcta.',
    en: 'The shortcut skips steps 2 to 5 and fills in <code>GitDog</code> and <code>repo</code>. Check that you are still on the right account.'
  },
  'login.token': { es: 'Token', en: 'Token' },
  'login.tokenHint': {
    es: 'El token se guarda cifrado en el Keychain de este Mac. No sale de aquí.',
    en: "The token is stored encrypted in this Mac's Keychain. It never leaves this computer."
  },
  'login.backToGithub': {
    es: 'Volver al inicio de sesión con GitHub',
    en: 'Back to signing in with GitHub'
  },

  'clone.title': { es: 'Clonar repositorio de {login}', en: 'Clone a repository from {login}' },
  'clone.button': { es: 'Clonar', en: 'Clone' },
  'clone.busy': { es: 'Clonando…', en: 'Cloning…' },
  'clone.search': { es: 'Buscar repositorio…', en: 'Search repositories…' },
  'clone.loading': { es: 'Cargando repositorios…', en: 'Loading repositories…' },
  'clone.done': { es: '{name} clonado', en: '{name} cloned' },
  'clone.chooseWhere': { es: 'Elige dónde guardar el proyecto', en: 'Choose where to save the project' },
  'clone.chooseFolder': { es: 'Elegir carpeta…', en: 'Choose folder…' },

  'publish.title': { es: 'Publicar en {login}', en: 'Publish to {login}' },
  'publish.button': { es: 'Publicar', en: 'Publish' },
  'publish.busy': { es: 'Publicando…', en: 'Publishing…' },
  'publish.done': { es: 'Publicado en {login}/{name}', en: 'Published to {login}/{name}' },
  'publish.name': { es: 'Nombre del repositorio', en: 'Repository name' },
  'publish.description': { es: 'Descripción (opcional)', en: 'Description (optional)' },
  'publish.private': { es: 'Repositorio privado', en: 'Private repository' }
} satisfies Record<string, Entry>
