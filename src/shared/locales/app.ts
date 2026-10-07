import type { Entry } from '../i18n'

/** App shell: welcome, update notice, sidebar, accounts, confirmations. */
export const app = {
  'app.openOnGithub': { es: 'Abrir en GitHub', en: 'Open on GitHub' },
  'app.updateAvailable': {
    es: 'Hay una versión nueva de GitDog: <b>{version}</b>.',
    en: 'A new version of GitDog is available: <b>{version}</b>.'
  },
  'app.download': { es: 'Descargar', en: 'Download' },
  'app.dismiss': { es: 'Cerrar aviso', en: 'Dismiss' },
  'app.welcomeText': {
    es: 'Conecta tus cuentas de GitHub y mueve tus proyectos entre ellas sin confundirte.',
    en: 'Connect your GitHub accounts and move between your projects without mixing them up.'
  },
  'app.connectAccount': { es: 'Conectar cuenta de GitHub', en: 'Connect a GitHub account' },
  'app.emptyAccountText': {
    es: 'Agrega una carpeta local o clona un repositorio de esta cuenta.',
    en: 'Add a local folder or clone a repository from this account.'
  },
  'app.addFolder': { es: 'Agregar carpeta local', en: 'Add a local folder' },
  'app.cloneRepo': { es: 'Clonar repositorio', en: 'Clone repository' },
  'app.initTitle': { es: 'Esta carpeta no es un repositorio', en: 'This folder is not a repository' },
  'app.initBody': {
    es: '{path}\n\n¿Quieres inicializar Git aquí? Después podrás hacer commits y publicarla en {login}.',
    en: '{path}\n\nDo you want to initialise Git here? Afterwards you can commit and publish it to {login}.'
  },
  'app.initConfirm': { es: 'Inicializar Git', en: 'Initialise Git' },
  'app.removeProjectTitle': { es: 'Quitar de la lista', en: 'Remove from list' },
  'app.removeProjectBody': {
    es: '"{name}" se quita de GitDog. La carpeta y sus archivos no se borran.',
    en: '"{name}" is removed from GitDog. The folder and its files are not deleted.'
  },
  'app.removeAccountTitle': { es: 'Quitar la cuenta {login}', en: 'Remove the account {login}' },
  'app.removeAccountBody': {
    es: 'Se borra el token de este Mac y se quitan sus proyectos de la lista. Las carpetas y los repositorios en GitHub no se tocan.',
    en: 'The token is deleted from this Mac and its projects are removed from the list. The folders and the repositories on GitHub are not touched.'
  },
  'app.removeAccountConfirm': { es: 'Quitar cuenta', en: 'Remove account' },

  'side.projects': { es: 'Proyectos', en: 'Projects' },
  'side.empty': { es: 'Aún no hay proyectos en esta cuenta.', en: 'There are no projects in this account yet.' },
  'side.localFolder': { es: 'Carpeta local', en: 'Local folder' },
  'side.creditTitle': {
    es: 'Escribir a Luis Felipe (luisfevq+gitdog@gmail.com)',
    en: 'Write to Luis Felipe (luisfevq+gitdog@gmail.com)'
  },
  'side.creditBy': { es: 'GitDog · por <b>Luis Felipe</b>', en: 'GitDog · by <b>Luis Felipe</b>' },
  'side.developer': { es: 'Desarrollador', en: 'Developer' },

  'acct.none': { es: 'Sin cuenta', en: 'No account' },
  'acct.accounts': { es: 'Cuentas', en: 'Accounts' },
  'acct.removeTitle': { es: 'Quitar cuenta de GitDog', en: 'Remove account from GitDog' },
  'acct.add': { es: 'Agregar cuenta…', en: 'Add account…' }
} satisfies Record<string, Entry>
