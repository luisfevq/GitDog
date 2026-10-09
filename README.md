<p align="center">
  <img src="resources/icon.png" width="128" alt="GitDog" />
</p>

<h1 align="center">GitDog</h1>

<p align="center">
  Cliente Git de escritorio para macOS con <b>varias cuentas de GitHub</b>.<br />
  Cambia de cuenta con un clic y mantén cada proyecto con su cuenta, sin confundirte.
</p>

---

## Qué hace

- **Varias cuentas**: el botón con el icono `⇄` (arriba a la derecha) cambia de cuenta o agrega otra.
- **Proyectos por cuenta**: agrega carpetas locales o clona repositorios de la cuenta activa.
- **Cada proyecto usa su cuenta**: push, pull y clone usan solo el token de esa cuenta. Los commits salen con su nombre y correo.
- **Día a día**: cambios, diff, commit, push y pull, con una barra de progreso mientras sube o baja.
- **Un solo botón de sincronización**: junto a la rama, el botón ofrece el siguiente paso (Publicar rama, Pull origin, Push origin o Fetch origin) y muestra el progreso dentro de sí mismo. GitDog busca cambios en GitHub cada 5 minutos.
- **Commit rápido**: con un solo archivo marcado, el mensaje por defecto es `Update <archivo>` (o `Create`, `Delete`, `Rename`). Debajo del commit, **Deshacer** revierte el último commit si aún no se subió, y devuelve los cambios y el mensaje.
- **Menú del archivo** (clic derecho): descartar cambios (se deja una copia en la Papelera), añadir a `.gitignore` (archivo, carpeta o extensión), copiar la ruta y mostrar en Finder.
- **Historial**: lista de commits con autor, fecha y etiquetas, marca lo pendiente de subir y muestra los archivos y el diff de cada commit.
- **Ramas**: lista con la fecha del último commit y buscador. Una rama nueva se publica con **Publicar rama**, y se puede hacer merge de otra rama en la actual. Si el merge tiene conflictos, queda abierto y GitDog muestra una ventana con los archivos en conflicto: los abres en tu editor (VS Code si está instalado), los resuelves, y pulsas **Continuar merge** (o **Cancelar merge**).
- **Cambios pendientes**: al cambiar de rama con cambios, pregunta si los dejas o los llevas. Al crear una rama, pregunta si sale de la actual o de `main`.
- **Tags**: crear (simples o anotados), subir, eliminar.
- **Releases**: crear un release de GitHub desde la pestaña Tags, con título, notas, archivos adjuntos (el `.dmg`, con el botón o arrastrándolo a la ventana) y barra de progreso. Antes de crear un tag o un release, GitDog muestra en qué commit y rama quedará, y avisa si no estás en la rama principal o si ese commit aún no está en GitHub. Se crea primero como borrador y solo se publica cuando los archivos ya están subidos.
- **Pull requests**: ver la lista, los archivos con su diff y la conversación. Crear PRs, dejar revisiones (aprobar, comentar, solicitar cambios) y hacer merge. Si la rama ya tiene un PR abierto, un push lo actualiza y la barra muestra **PR #n** en vez de ofrecer crear otro.
- **Español e inglés**: se elige en el menú de la cuenta, arriba a la derecha. Por defecto usa el idioma del sistema.
- **Versiones nuevas**: al abrir, y cada 6 horas, GitDog busca el último Release del repositorio y avisa si hay una versión más reciente. Si cierras el aviso, vuelve a aparecer a las 6 horas.
- **Publicar**: convierte una carpeta local en un repositorio nuevo de la cuenta activa.

## Descargar e instalar (sin código)

Ve a la sección **[Releases](../../releases/latest)** de este repositorio y descarga `GitDog-<versión>-arm64.dmg`.

**Requisito:** un Mac con Apple Silicon (M1, M2, M3, M4…). Los instaladores nuevos ya no incluyen a los Mac con procesador Intel. Para comprobar tu Mac: menú  → **Acerca de este Mac**; debe decir "Chip: Apple…". Las versiones hasta la 1.1.0 todavía tienen el instalador `x64` para Intel. En un Mac Intel, GitDog no avisa de las versiones nuevas.

1. Abre el `.dmg`.
2. Arrastra **GitDog** a la carpeta **Aplicaciones**.
3. Abre GitDog desde Launchpad o Spotlight.

### Seguridad

Los instaladores de Releases están **firmados con Developer ID de Apple y notarizados**. macOS abre GitDog sin avisos. Descarga solo desde la sección Releases de este repositorio.

Si generas tu propio instalador con `npm run dist`, queda sin notarizar y macOS sí muestra un aviso. Mira [Solución de problemas](#solución-de-problemas).

## Conectar una cuenta

Abre GitDog y pulsa **Conectar cuenta de GitHub**.

**Con token (funciona siempre).** La app muestra los pasos. En resumen:

1. Entra en github.com con la cuenta que quieres agregar.
2. Foto de perfil → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**.
3. En **Note** escribe `GitDog`, elige **No expiration** y marca el permiso `repo`.
4. Pulsa **Generate token**, copia el texto `ghp_…` y pégalo en GitDog.

Atajo: la app tiene un botón que abre esa página con `repo` ya marcado.

Para agregar otra cuenta, cambia de cuenta en GitHub (en el navegador), crea su token y repite.

**Con el navegador (opcional).** Si tienes una OAuth App de GitHub con "Device Flow" activado, pasa su Client ID al arrancar:

```bash
GITDOG_CLIENT_ID=tu_client_id npm run dev
```

Con eso aparece el botón **Iniciar sesión con GitHub**. Se crea en GitHub → Settings → Developer settings → OAuth Apps. No hace falta el secret.

### Qué permite el permiso `repo`

Clone, pull, push, crear repos, ramas, tags, pull requests (crear, revisar, hacer merge) e issues.
No permite cambiar archivos de `.github/workflows/` (hace falta el permiso `workflow`), ni borrar repositorios, ni administrar organizaciones.
En organizaciones con SAML SSO, autoriza el token para esa organización desde la lista de tokens de GitHub (**Configure SSO**).

## Para desarrolladores

### Requisitos

- macOS
- [Node.js](https://nodejs.org) 18 o superior (recomendado 20)
- Git (`git --version`)

### Instalar y ejecutar

```bash
git clone <url-de-este-repositorio>
cd GitDog
npm install
npm run dev
```

`npm run dev` abre la app de escritorio en modo desarrollo:

- Los cambios en la interfaz (`src/renderer`) se ven al guardar.
- Los cambios en `src/main` o `src/preload` reinician la app solos.
- Solo reinicia el comando si cambias `package.json` o `electron.vite.config.ts`.

### Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | App en modo desarrollo, con recarga |
| `npm run build` | Compila la app en `out/` |
| `npm run typecheck` | Revisa los tipos de TypeScript |
| `npm run dist` | Genera los instaladores `.dmg` en `dist/` |
| `npm run icon` | Regenera el icono desde `resources/icon-source.png` |

### Generar el instalador

```bash
npm run dist
```

Crea `dist/GitDog-<versión>-arm64.dmg`, solo para Apple Silicon. Esta app se firma "ad hoc", sin certificado, así que cualquier persona puede generarla sin cuenta de Apple Developer. No está notarizada: macOS muestra un aviso la primera vez que se abre (mira [Solución de problemas](#solución-de-problemas)).

#### Instalador firmado y notarizado (el de Releases)

Así se generan los instaladores de Releases. Necesita una cuenta de Apple Developer (99 USD al año), y la firma lleva el nombre del titular de esa cuenta. Con firma **Developer ID** y notarización, macOS abre GitDog sin avisos, y el Keychain no debería volver a pedir permiso tras cada actualización.

Necesitas:

1. Un certificado **Developer ID Application** en tu Keychain. Se crea en Xcode: **Settings** → **Accounts** → tu cuenta → **Manage Certificates** → **+** → **Developer ID Application**. Un certificado "Apple Development" no sirve para repartir la app.
2. Tu **Apple ID** (correo) y tu **Team ID** (developer.apple.com → **Membership details**).
3. Una **contraseña específica de app**: appleid.apple.com → **Sign-In and Security** → **App-Specific Passwords**.

Luego:

```bash
npm run dist:signed
```

El script pide lo que falte. La contraseña se escribe oculta y no se guarda en ningún archivo. Tarda unos minutos porque Apple revisa la app.

### Publicar una versión

Los instaladores no se suben al código del repositorio (`dist/` está en `.gitignore`). Se adjuntan a un **Release** de GitHub, y de ahí los descarga la gente.

1. Sube el número de `version` en `package.json`.
2. `npm run dist:signed` (instalador firmado y notarizado)
3. Crea el release y adjunta el `.dmg`. Con la CLI de GitHub:

   ```bash
   gh release create v1.2.2 dist/GitDog-1.2.2-arm64.dmg \
     --title "GitDog 1.2.2" --generate-notes
   ```

   También puedes hacerlo desde la web: **Releases** → **Draft a new release** → arrastra el archivo.

   O desde GitDog, con la cuenta del proyecto: pestaña **Tags** → **Crear release…** → escribe el tag (por ejemplo `v1.2.2`), añade el `.dmg` de `dist/` (o arrástralo a la ventana) y pulsa **Publicar release**. Si el tag solo existe en tu Mac, GitDog lo sube antes; si no existe, GitHub lo crea en el último commit de la rama principal.

### Cómo funciona

- Cada cuenta guarda su token cifrado con el Keychain de macOS (`safeStorage`), en `secrets.json`.
- Cada proyecto pertenece a una cuenta. Para push, pull y clone, GitDog pasa el token de esa cuenta con `GIT_ASKPASS` y desactiva los credential helpers. No modifica tu `~/.gitconfig`.
- Los commits y tags anotados usan el nombre y el correo de la cuenta del proyecto, con `git -c user.name=… -c user.email=…`.
- Los remotos SSH de GitHub se reescriben a HTTPS durante push, pull y clone, para usar el token.
- "Dejar mis cambios" al cambiar de rama usa `git stash` con el mensaje `gitdog:<rama>`. Al volver a esa rama aparece **Restaurar cambios**.
- `config.json` (cuentas y proyectos, sin secretos) está separado de `secrets.json`. Así se podrá sincronizar entre Macs sin copiar tokens.

Los datos están en `~/Library/Application Support/GitDog/`. Para empezar de cero, cierra la app y borra esa carpeta.

### Estructura

```
src/main        Proceso principal de Electron
  git.ts          Comandos de git
  github.ts       API de GitHub (repos, PRs, revisiones, merge)
  oauth.ts        Login por navegador (device flow)
  store.ts        Cuentas, proyectos y tokens
  ipc.ts          Puente entre la interfaz y el proceso principal
src/preload     Puente seguro hacia la interfaz
src/shared      Tipos, lista de métodos de la API y textos (locales/, en español e inglés)
src/renderer    Interfaz en React
resources       Icono de la app
scripts         Icono, nombre en desarrollo y firma del instalador
```

Para agregar o cambiar un texto, edita el archivo de `src/shared/locales/` que corresponda. Cada mensaje tiene su versión en español y en inglés, y el compilador avisa si falta una. En la interfaz se usa `t('clave')`.

Para agregar una función: define el método en `src/shared/types.ts` (interfaz `Api` y `API_METHODS`), impleméntalo en `src/main/ipc.ts`, y úsalo desde la interfaz con `window.api`.

## Solución de problemas

| Problema | Solución |
| --- | --- |
| macOS dice que GitDog "está dañado" o "no se puede abrir" | Solo pasa con instaladores generados con `npm run dist` (sin notarizar). Haz clic derecho sobre GitDog → **Abrir**, o ejecuta `xattr -cr /Applications/GitDog.app`. El instalador de Releases no lo necesita |
| "Token inválido o expirado" | Crea un token nuevo y vuelve a conectar la cuenta |
| Error 403 o 404 en un repo de una organización | Autoriza el token para SSO, o pide acceso al repo |
| Push rechazado en `.github/workflows/` | Añade el permiso `workflow` al token |
| El Dock dice "Electron" en modo desarrollo | Cierra la app, ejecuta `killall Dock` y abre `npm run dev` otra vez |

## Pendiente

- Comentarios sobre líneas concretas del diff en las revisiones.
- Sincronizar cuentas y proyectos entre Macs (iCloud).
- Resolver conflictos de merge dentro de la app.

## Autor

Desarrollado por **Luis Felipe**. Escríbeme: [luisfevq+gitdog@gmail.com](mailto:luisfevq+gitdog@gmail.com).
