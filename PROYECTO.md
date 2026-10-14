# GitDog: estado del proyecto

Documento interno. Explica qué hace GitDog, cómo está hecho, qué decisiones se tomaron y qué falta.
El `README.md` es para usuarios. Este archivo es para quien continúe el trabajo, sea una persona o una sesión nueva de Claude.

Última actualización: 2026-10-14 · Versión local: **1.2.3** · Última versión publicada: **1.2.2**

> Este repositorio es público. No escribas aquí tokens, contraseñas, Apple ID, Team ID, correos privados ni nombres de cuentas de trabajo.

## Índice

1. [Qué es GitDog](#1-qué-es-gitdog)
2. [Estado actual](#2-estado-actual)
3. [Stack y comandos](#3-stack-y-comandos)
4. [Arquitectura](#4-arquitectura)
5. [Mapa de archivos](#5-mapa-de-archivos)
6. [Funciones terminadas](#6-funciones-terminadas)
7. [Decisiones de diseño](#7-decisiones-de-diseño)
8. [Cómo publicar una versión](#8-cómo-publicar-una-versión)
9. [Cómo agregar cosas](#9-cómo-agregar-cosas)
10. [Cómo se verifica](#10-cómo-se-verifica)
11. [Problemas conocidos y trampas](#11-problemas-conocidos-y-trampas)
12. [Pendientes](#12-pendientes)
13. [Historial de versiones](#13-historial-de-versiones)
14. [Preferencias del autor](#14-preferencias-del-autor)
15. [Cómo retomar el trabajo](#15-cómo-retomar-el-trabajo)

---

## 1. Qué es GitDog

Un cliente Git de escritorio para macOS, parecido a GitHub Desktop, con **varias cuentas de GitHub**.

**El problema que resuelve:** el autor trabaja en proyectos de varias cuentas de GitHub. Con las herramientas normales se confunde de cuenta al hacer push, commit o clone. En GitDog cada proyecto pertenece a una cuenta, y todas las acciones usan solo la credencial de esa cuenta.

**Idea de la interfaz:** arriba a la derecha hay un botón con la cuenta activa y un icono `⇄`. Ahí se cambia de cuenta o se agrega otra. La barra lateral muestra los proyectos de la cuenta activa. Se puede agregar una carpeta local o clonar un repositorio de esa cuenta.

**Estilo visual:** tema oscuro, estilo macOS (barra de título integrada, vibrancy, tipografía del sistema).

**Distribución:** instalador `.dmg` firmado con Developer ID y notarizado por Apple, publicado en los Releases del repositorio. Solo Apple Silicon.

## 2. Estado actual

| Dato | Valor |
| --- | --- |
| Rama de trabajo | `main` (el flujo normal usa ramas y PRs) |
| Versión en `package.json` | 1.2.3 |
| Último release publicado | `v1.2.2` (solo `arm64`) |
| Tag `v1.2.2` | Apunta al último commit de `main` |
| Cambios sin commit | Ninguno al momento de escribir esto, salvo este archivo |
| Releases anteriores | `v0.1.0`, `v1.0.2`, `v1.1.0` (con Intel), `v1.2.0`, `v1.2.1` |

El repositorio es público: `github.com/luisfevq/GitDog`.

## 3. Stack y comandos

| Pieza | Versión / detalle |
| --- | --- |
| Electron | 33 |
| React | 18, sin librería de estado (hooks) |
| TypeScript | 5.6, modo estricto |
| Build | `electron-vite` 2 + Vite 5 |
| Instalador | `electron-builder` 25 |
| Node | 18 funciona. Se recomienda 20 |
| Git | Se usa el `git` del sistema (`/usr/bin/git`) |

```bash
npm install
npm run dev          # desarrollo; recarga la interfaz y reinicia al cambiar main/preload
npm run typecheck    # tipos de main y de la interfaz
npm run build        # compila a out/
npm run dist         # .dmg sin certificado (firma ad hoc). Sin notarizar
npm run dist:signed  # .dmg firmado y notarizado (necesita cuenta de Apple Developer)
npm run icon         # regenera el icono desde resources/icon-source.png
```

`npm run dev` ejecuta antes `scripts/patch-dev-electron.js`. Ese script cambia el nombre y el icono del Electron de desarrollo (en `node_modules`) para que el Dock diga GitDog. Si el Dock muestra el nombre viejo: cerrar la app, `killall Dock` y abrirla otra vez.

## 4. Arquitectura

```
┌────────────── Proceso principal (src/main) ──────────────┐
│ git.ts      comandos de git (execFile / spawn)          │
│ github.ts   API REST y GraphQL de GitHub, subida de archivos
│ oauth.ts    login por navegador (device flow), opcional │
│ store.ts    cuentas, proyectos y tokens                 │
│ release.ts  crear un release de forma segura            │
│ update.ts   buscar versión nueva                        │
│ lang.ts     idioma de los mensajes del proceso principal│
│ ipc.ts      registra todos los métodos de la API        │
└───────────────────────────┬──────────────────────────────┘
                            │ IPC: api:<nombre>  +  evento git:progress
┌───────────────────────────┴──────────────────────────────┐
│ Preload (src/preload): window.api, window.events,        │
│ window.files.pathFor                                     │
└───────────────────────────┬──────────────────────────────┘
┌───────────────────────────┴──────────────────────────────┐
│ Interfaz (src/renderer): React + i18n                    │
└──────────────────────────────────────────────────────────┘
        src/shared: tipos, lista de métodos y textos (usado por los tres)
```

### Cuentas y credenciales

- **Login:** hoy se hace con un *personal access token* (classic) con el permiso `repo`. La app muestra los pasos. El login por navegador (device flow) existe, pero solo aparece si se arranca con `GITDOG_CLIENT_ID=<id de una OAuth App con Device Flow>`.
- **Almacenamiento:** dos archivos en `~/Library/Application Support/GitDog/`.
  - `config.json`: cuentas, proyectos y cuenta activa. Sin secretos. Se podrá sincronizar entre Macs.
  - `secrets.json`: tokens cifrados con `safeStorage` (Keychain de macOS). Se quedan en cada Mac.
- **Identidad del commit:** nombre y correo de la cuenta del proyecto. El correo es el público de la cuenta o, si no hay, `ID+login@users.noreply.github.com`.

### Cómo se usa el token con git

`git.ts` pasa el token de la cuenta del proyecto solo en los comandos que hablan con GitHub (push, pull, fetch, clone, ls-remote):

- `GIT_ASKPASS` apunta a un script (`askpass.sh`, se escribe en la carpeta de datos). El script lee el usuario y el token de variables de entorno.
- `-c credential.helper=` anula el llavero de macOS, para no usar por error la sesión de otra cuenta.
- `-c url.https://github.com/.insteadOf=git@github.com:` hace que un remoto SSH use HTTPS y el token.
- `GIT_TERMINAL_PROMPT=0` evita preguntas en la terminal.
- Los commits usan `-c user.name=... -c user.email=...` de la cuenta. No se toca `~/.gitconfig`.

### Comunicación

- Todos los métodos de la API están declarados en `src/shared/types.ts` (interfaz `Api` y lista `API_METHODS`). El preload crea una función por cada nombre. `ipc.ts` implementa cada una.
- El progreso de push, pull, fetch, clone y subida de archivos viaja por el evento `git:progress`. El proceso principal lo limita a unas 15 veces por segundo. En la interfaz lo recibe `useGitProgress`.
- Los errores salen del proceso principal ya traducidos (ver *Idioma*).

### Idioma (español e inglés)

- Cada texto vive en `src/shared/locales/<área>.ts` con las dos versiones juntas: `{ es: '...', en: '...' }`. Si falta una, el compilador falla.
- Plurales: `{n} {n?commit|commits}`. Se elige la primera opción cuando `n` es 1.
- Texto con negrita o código: `<b>…</b>` y `<code>…</code>`, con `tr('clave', {…})` en la interfaz.
- La interfaz usa `useI18n()` (`t`, `tr`, `lang`, `setLang`). El idioma se guarda en `localStorage` (`gitdog.lang`); por defecto, el del sistema.
- La interfaz avisa al proceso principal con `setLanguage` para que sus errores salgan en el mismo idioma.
- El inglés de la interfaz usa ortografía británica (`initialise`, `authorise`).

## 5. Mapa de archivos

| Ruta | Qué contiene |
| --- | --- |
| `src/main/git.ts` | Todos los comandos de git. Estado, diff, stage, commit, ramas, stash, tags, merge, conflictos, amend, descartar, ignorar, fetch, push, pull, clone |
| `src/main/github.ts` | Usuario, repos, PRs (lista, detalle, archivos, conversación, crear, revisar, merge), correos, releases y subida de archivos |
| `src/main/ipc.ts` | Implementación de la API. Validaciones de entrada |
| `src/main/release.ts` | Secuencia segura de crear un release |
| `src/main/update.ts` | Busca versión nueva. `isNewer`, regla para Intel |
| `src/main/store.ts` | Lectura y escritura de `config.json` y `secrets.json` |
| `src/main/oauth.ts` | Device flow de GitHub |
| `src/main/lang.ts` | Idioma activo del proceso principal |
| `src/preload/index.ts` | Puente seguro hacia la interfaz |
| `src/shared/types.ts` | Tipos y `API_METHODS` |
| `src/shared/i18n.ts`, `messages.ts`, `locales/*.ts` | Sistema de idiomas y textos |
| `src/shared/app-info.ts` | `RELEASES_REPO` y `LAST_INTEL_VERSION` |
| `src/renderer/src/App.tsx` | Estructura general, cuentas, aviso de versión |
| `src/renderer/src/components/RepoView.tsx` | Pantalla de un proyecto: barra, pestañas, cambios, commit |
| `.../HistoryView.tsx` | Historial con menú de clic derecho |
| `.../TagsView.tsx`, `ReleaseModal.tsx` | Tags y releases |
| `.../PullsView.tsx`, `PullDetailPane.tsx`, `CreatePrModal.tsx`, `ReviewModal.tsx`, `MergeModal.tsx` | Pull requests |
| `.../BranchMenu.tsx`, `BranchModals.tsx`, `CommitModals.tsx` | Ramas y diálogos de commit |
| `.../ConflictsModal.tsx` | Conflictos de un merge |
| `src/renderer/src/styles.css` | Todo el estilo (variables de tema arriba) |
| `scripts/` | Icono, nombre en desarrollo, firma del instalador |
| `electron-builder.signed.js` | Configuración del instalador firmado y notarizado |
| `resources/` | Icono (`icon-source.png` es el original) |

## 6. Funciones terminadas

### Cuentas y proyectos
- Conectar varias cuentas. Cambiar de cuenta. Quitar cuenta (borra su token de este Mac y la quita de la lista; no borra carpetas ni repos).
- Agregar una carpeta local. Si no es un repositorio, ofrece inicializar Git.
- Clonar un repositorio de la cuenta activa (con búsqueda y barra de progreso).
- Publicar un proyecto local: crea el repositorio en GitHub (público o privado) y hace el primer push.
- Botón **Abrir en GitHub** junto al nombre del proyecto.
- Botón de contacto con el autor (correo) en la barra lateral y en el panel "Acerca de".

### Cambios y commit
- Lista de archivos con casillas (stage y unstage), diff, y estado por archivo.
- Commit con mensaje. Con **un solo archivo** marcado, el mensaje por defecto es `Update <archivo>` (también `Create`, `Delete`, `Rename`). Se muestra en gris y se usa si el campo está vacío. Los verbos van en inglés a propósito, en los dos idiomas.
- **Deshacer** el último commit (si no se subió y no es de merge ni el primero). Devuelve los cambios y el mensaje.
- Menú de clic derecho en un archivo: descartar cambios (el archivo actual va a la Papelera antes de restaurarlo), descartar todos, ignorar archivo / carpeta / extensión (escribe en `.gitignore` sin duplicar; solo para archivos que Git aún no sigue), copiar ruta, mostrar en Finder.

### Sincronización
- Un solo botón junto a la rama que ofrece el paso siguiente: **Publicar proyecto**, **Publicar rama**, **Pull origin**, **Push origin** o **Fetch origin** (con "última actualización").
- La barra de progreso va dentro del botón, con la fase y el porcentaje.
- GitDog hace fetch en segundo plano cada 5 minutos si la rama está publicada.
- Pull con `--ff-only`. El mensaje es un resumen ("Cambios descargados (3 archivos)"). Un error largo de Git se acorta en el aviso.

### Ramas
- Menú con fecha del último commit, buscador y marca de rama principal.
- Nueva rama: desde la actual o desde la rama principal.
- Al cambiar de rama (o crear desde otra) con cambios pendientes: pregunta si se **dejan** (stash con el mensaje `gitdog:<rama>`, y un aviso **Restaurar cambios** al volver) o se **llevan**.
- **Merge de otra rama en la actual**: muestra cuántos commits trae.
- **Conflictos de merge**: el merge queda abierto y aparece un modal con los archivos en conflicto (ver abajo).

### Conflictos de merge (versión 1.2.2)
- Cada archivo tiene el estado **Quedan conflictos** o **Sin conflictos pendientes**, y un botón **Abrir** (VS Code si está en `/Applications`; si no, la app por defecto). También hay **Abrir en Terminal**.
- El modal consulta el estado cada 2 segundos y al volver a la ventana. Si el editor deja el archivo en el índice, igual aparece como resuelto.
- Un archivo está resuelto cuando ya no tiene líneas `<<<<<<<` y `>>>>>>>`. Un `=======` suelto (por ejemplo en markdown) no cuenta.
- Si un lado borró el archivo no hay marcas. El modal dice qué lado lo borró y qué versión se conserva.
- **Continuar merge** se activa cuando todo está resuelto. Agrega los archivos y hace el commit. **Cancelar merge** pide confirmación y ejecuta `git merge --abort`.
- Si se cierra el modal, el merge sigue abierto: un aviso arriba permite volver.

### Historial
- Lista con avatar, autor, fecha relativa y etiquetas de ramas y tags.
- Sección **Pendiente de subir** arriba, y **Ya en GitHub** abajo. La pestaña muestra un globo con los pendientes.
- Detalle del commit: mensaje, hash con **Copiar**, archivos y diff. En un commit de merge se compara con el primer padre.
- Menú de clic derecho en un commit: **Modificar commit** (cambia el mensaje y puede incluir los archivos marcados; solo el último commit sin subir), **Deshacer commit**, **Crear rama desde este commit**, **Crear tag** (en ese commit), **Copiar SHA**.
- El avatar usa la foto de la cuenta para sus commits, aunque un merge hecho en la web tenga otro correo (se compara el nombre del autor).

### Tags
- Lista con estado **En GitHub** o **Solo local**, y marca de tag anotado. El hash es el del commit, también en los anotados.
- Crear tag: con mensaje es anotado; sin mensaje es ligero. Casilla para subirlo al crear.
- Debajo del formulario se muestra dónde quedará: rama, hash y asunto del commit. Avisa si no se está en la rama principal o si el commit no está en GitHub.
- Subir un tag, y eliminar (local, y opcionalmente en GitHub).

### Releases
- **Crear release…** (botón junto a "Crear tag" y botón **Release** en cada tag).
- Campos: tag (con lista), título (sugerencia en gris: `<Proyecto> <versión>`), notas, notas automáticas de GitHub, archivos, borrador, pre-release.
- Los archivos se eligen con un diálogo (abre en `dist/`) o **se arrastran a la ventana**. Las carpetas se rechazan.
- Secuencia (`release.ts`): comprueba que no exista un release para ese tag → sube el tag si solo está en el Mac → crea un **borrador** → sube los archivos con progreso → **publica**. Si falla una subida, borra el borrador. Si falla la publicación, el borrador queda con los archivos.
- Si el tag es nuevo, lo crea GitHub en el último commit de la **rama principal de GitHub** (no la rama local). La ventana lo explica y avisa de commits sin subir.
- Límite de GitHub por archivo: 2 GB (se valida).

### Pull requests
- Lista (abiertos, cerrados, todos) con detalle: resumen, archivos con diff, conversación (revisiones, comentarios, comentarios de línea en solo lectura).
- **Crear PR**: sugiere título y descripción desde los commits, elige rama destino, borrador. Solo aparece cuando se puede usar (rama subida, sin PR abierto).
- Si la rama ya tiene un PR abierto, el botón dice **PR #n**, y tras un push el aviso dice que el PR se actualizó.
- **Revisar**: aprobar, comentar o solicitar cambios. En un PR propio solo se puede comentar (regla de GitHub).
- **Merge** del PR: método (merge, squash o rebase, según lo que el repo permita), borrar la rama después, y **correo del commit de merge** (privado de GitHub por defecto; el predeterminado de GitHub; o uno verificado si el token tiene `user:email`). Usa GraphQL cuando se elige un correo.
- Contadores en las pestañas (cambios, historial pendiente, tags, PRs abiertos).

### Idioma, avisos y varios
- Español e inglés, cambio inmediato (menú de la cuenta).
- Aviso de versión nueva al abrir y cada 6 horas. Si se cierra, vuelve a las 6 horas (o antes si sale otra versión). **Buscar actualizaciones** en el menú de la cuenta, con la versión instalada.
- Menús de clic derecho y efecto hover en pestañas.
- Un archivo soltado fuera de una zona de arrastre no hace que la ventana navegue hacia él.

## 7. Decisiones de diseño

| Decisión | Motivo |
| --- | --- |
| Cada proyecto pertenece a una cuenta | Es el objetivo del programa: no mezclar cuentas |
| Token por comando, con `GIT_ASKPASS` | No se escribe en disco ni en la configuración de Git |
| `config.json` separado de `secrets.json` | Permite sincronizar la configuración sin copiar tokens |
| Se usa el `git` del sistema | Mismo comportamiento que la terminal; sin dependencias nativas |
| "Dejar mis cambios" = `git stash push -u` con mensaje `gitdog:<rama>` | Se puede restaurar al volver, y no se mezcla con stashes del usuario |
| Descartar envía a la Papelera | Recuperable, a diferencia de `git checkout` |
| Release como borrador → subir → publicar | Nunca queda un release público sin sus archivos |
| Se usa la palabra **merge** en la interfaz en español | Preferencia del autor. No usar "fusionar" |
| Verbos de commit por defecto en inglés (`Update …`) | Preferencia del autor y convención de Git |
| Solo Apple Silicon desde la 1.2.0 | Decisión del autor. `LAST_INTEL_VERSION = 1.1.0` evita ofrecer a un Mac Intel versiones que no puede abrir |
| Solo `arm64` en `electron-builder` | Un instalador, más simple de publicar |
| `npm run dist` firma ad hoc; `dist:signed` usa Developer ID | Cualquiera puede compilar sin cuenta de Apple. Solo el autor publica versiones firmadas |
| El aviso de versión usa la API y, si falla, la redirección pública de `/releases/latest` | La API sin token tiene un límite de 60 consultas por hora por IP |
| Los errores del proceso principal se traducen allí | La interfaz solo los muestra |

## 8. Cómo publicar una versión

Requisitos (una sola vez en el Mac del autor):
- Certificado **Developer ID Application** en el llavero `login` (no sirve "Apple Development").
- Tu Apple ID, tu Team ID y una **contraseña específica de app** (appleid.apple.com → Sign-In and Security → App-Specific Passwords). `dist-signed.sh` los pide; la contraseña se escribe oculta y no se guarda.

Pasos:

1. **Subir la versión:** `npm version X.Y.Z --no-git-tag-version`. Actualizar los ejemplos del README si citan el número.
2. **Commit y push** de los cambios (por ejemplo con GitDog, que usa el token de la cuenta del proyecto). Si `main` está protegido, hacerlo por rama y PR.
3. **Generar el instalador:** `npm run dist:signed`. Crea `dist/GitDog-X.Y.Z-arm64.dmg`, firmado y notarizado. Tarda unos minutos.
4. **Verificar:**
   ```bash
   spctl -a -vv dist/mac-arm64/GitDog.app        # accepted · source=Notarized Developer ID
   xcrun stapler validate dist/mac-arm64/GitDog.app
   ```
5. **Crear el release** con GitDog: pestaña **Tags** → **Crear release…** → tag `vX.Y.Z` → añadir el `.dmg` → notas → **Publicar release**. Debajo del tag se ve el commit donde quedará. Alternativa: la web de GitHub, o `gh release create` con la cuenta correcta.
6. Subir **solo** el `.dmg` de la versión nueva. En `dist/` quedan archivos de versiones anteriores.
7. Comprobar con **Buscar actualizaciones** en una versión anterior.

Notas de la versión: se escriben en español e inglés, y solo cubren lo nuevo desde el release anterior.

### Sobre los tags
- **Pestaña Tags → Crear tag:** apunta al último commit de la rama **en la que estás** (aunque no esté subido).
- **Historial → Crear tag…:** apunta al commit elegido.
- **Crear release con un tag nuevo:** lo crea GitHub, en el último commit de la rama principal **de GitHub**.
- Un tag de un commit que no está en GitHub sube ese commit "sin rama". La interfaz avisa.
- Práctica segura: hacer merge a `main`, hacer pull, estar en `main`, y recién crear el tag.
- GitDog **no** mueve tags ya publicados. Para corregir uno: eliminarlo (local y en GitHub) y crearlo de nuevo. Mientras no tenga release, es seguro.

## 9. Cómo agregar cosas

**Un método nuevo de la API**
1. En `src/shared/types.ts`: agregarlo a la interfaz `Api` y a `API_METHODS`.
2. En `src/main/ipc.ts`: implementarlo. Validar las entradas. Los comandos de git van en `git.ts`; las llamadas a GitHub, en `github.ts`.
3. En la interfaz: `window.api.<nombre>(...)`.

**Un texto nuevo**
1. Agregar la clave en el archivo de `src/shared/locales/` que corresponda, con `es` y `en`. Usar un prefijo de área (`rp.`, `br.`, `cf.`…).
2. Usarlo con `t('clave')` o `tr('clave', {…})`. En el proceso principal: `t` de `src/main/lang.ts`.
3. Si es un archivo de área nuevo, registrarlo en `src/shared/messages.ts`.

**Un diálogo:** usar `Modal` y `ConfirmModal` (`Modal.tsx`). El botón rojo se obtiene con `danger`.

**Un menú de clic derecho:** `ContextMenu.tsx` recibe una lista de `MenuItem`.

## 10. Cómo se verifica

No hay pruebas automáticas dentro del repositorio. Hasta ahora cada cambio se verificó así:

1. `npm run typecheck` y `npm run build`.
2. **Lógica de Git:** scripts temporales (con `esbuild`) que importan `src/main/git.ts` y trabajan sobre repositorios temporales reales, incluidos remotos locales (`git init --bare`).
3. **GitHub:** un `fetch` simulado y un servidor HTTP local para las subidas. No se crean releases ni PRs reales en las pruebas.
4. **Interfaz:** se sirve `out/renderer` con un `window.api` falso (un `mock.js`) en el navegador integrado, se simulan los datos y se comprueba el resultado.
5. **Idiomas:** un script compara todos los mensajes: ninguno vacío, mismos marcadores `{x}` y mismas etiquetas `<b>` en español e inglés. Se buscó también texto suelto con acentos fuera de `locales/`.

Idea (no hecha): convertir estos scripts en pruebas del repositorio y correr el typecheck en GitHub Actions.

## 11. Problemas conocidos y trampas

- **`gh` y `git` de la terminal pueden usar otra cuenta.** Las credenciales de la terminal (`osxkeychain`, `gh`) no son las de GitDog. Para publicar, hacer push o crear releases en un repo de una cuenta, usar GitDog con esa cuenta.
- **Aviso del Keychain.** La primera vez que una versión nueva lee los tokens, macOS pide permiso para "GitDog Safe Storage". Hay que pulsar **Always Allow**. Con firma Developer ID no debería repetirse en cada versión.
- **Electron 33 ya no da `File.path`.** El arrastre de archivos usa `webUtils.getPathForFile` en el preload (`window.files.pathFor`). El proceso principal solo acepta rutas que existan y sean archivos.
- **El proceso principal acepta para subir solo archivos elegidos** con el diálogo o soltados en la ventana (`pickedFiles` en `ipc.ts`).
- **Sondeo cada 8 segundos.** `RepoView` consulta el estado cada 8 s y al volver a la ventana. Cada consulta lanza varios comandos de git. En repositorios muy grandes puede pesar.
- **`pull` solo avanza** (`--ff-only`). Si las ramas divergieron, falla con el mensaje de Git.
- **Mientras hay un merge abierto** no se bloquean otras acciones. Un commit normal terminaría el merge.
- **Conflictos sin marcas** (un lado borró el archivo, o archivos binarios) aparecen como "resueltos" desde el inicio. El modal explica el caso de archivo borrado; en binarios no hay aviso especial.
- **Ignorar** solo funciona con archivos que Git aún no sigue.
- **Correo de los merges hechos en la web.** El botón verde de GitHub usa el correo principal de la cuenta. Conviene revisar esa opción en los ajustes de correo de GitHub. GitDog permite elegir el correo al hacer merge de un PR (con el token con `user:email` se ven todos los correos verificados).
- **El proceso de desarrollo modifica `node_modules`** (nombre e icono de Electron) y vuelve a firmarlo. Si se reinstalan las dependencias, `npm run dev` lo repite solo.
- **Node 18** funciona con las versiones actuales. Si se sube `electron-vite`, revisar el requisito de Node.
- **La política de contenido** de `index.html` permite imágenes de `avatars.githubusercontent.com` y WebSocket local en desarrollo. Cualquier recurso externo nuevo hay que agregarlo ahí.

## 12. Pendientes

### Por verificar en la app de escritorio real
Todo esto se probó con repos temporales y con la interfaz simulada, pero **no** en la app instalada:
- [ ] Arrastrar archivos al diálogo de release (`webUtils`).
- [ ] Descartar cambios: que la copia llegue a la Papelera de macOS.
- [ ] **Abrir** en el editor (VS Code y sin VS Code) y **Abrir en Terminal**, en el modal de conflictos.
- [ ] Un conflicto de merge real de punta a punta (abrir, resolver en el editor, continuar).
- [ ] Crear un release real desde GitDog (con los archivos subidos). Verificar los tres casos: tag nuevo, tag solo local, tag ya subido.
- [ ] El aviso de versión nueva en un Mac con 1.0.2 o posterior cuando salga otra versión.
- [ ] Merge de un PR con un correo elegido (GraphQL) en un repositorio real.

### Ofrecido y esperando decisión del autor
- [ ] Botón **"Actualizar tag en GitHub"** (forzar un tag que cambió de commit), con confirmación. Hoy se hace eliminando y creando de nuevo.
- [ ] Botones **"usar mi versión" / "usar la de la otra rama"** por archivo en el modal de conflictos (hoy se resuelve solo en el editor).
- [ ] Login por navegador: falta registrar una OAuth App con Device Flow y dar su Client ID (`GITDOG_CLIENT_ID` o `src/main/oauth.ts`).
- [ ] Decidir si se reescribe o se recrea el historial del repositorio para quitar un correo no deseado de dos commits de merge antiguos. Si se hace, debe ser **antes** de que más gente clone el repo. Primero cambiar los ajustes de correo de GitHub.

### Ideas sin empezar
- Sincronizar `config.json` entre Macs (iCloud Drive). Los tokens no se copian: cada Mac inicia sesión.
- Comentarios sobre líneas concretas del diff en las revisiones de PR.
- Pull con opción de merge o rebase cuando las ramas divergen.
- Pantalla para ver y administrar los stashes.
- Pruebas automáticas y GitHub Actions (ver sección 10).
- Actualización automática dentro de la app (hoy solo hay aviso).
- Elegir una licencia para el repositorio público (sin licencia, otras personas no pueden reutilizar el código).
- Proteger `main` en GitHub (PR obligatorio, sin push forzado).

## 13. Historial de versiones

| Versión | Contenido principal |
| --- | --- |
| `0.1.0` | Primer release. Cuentas, proyectos, cambios, commit, push, pull, ramas |
| `1.0.2` | Instalador firmado y notarizado. Tags, pull requests (ver, crear, revisar, merge), cambio de rama con cambios pendientes, icono, aviso de versión |
| `1.1.0` | Español e inglés. Botón único de sincronización con progreso. Menú de archivos, commit por defecto, deshacer, historial con pendientes, creación de PR solo cuando se puede, contadores |
| `1.2.0` | Menú del historial (modificar, deshacer, rama, tag, SHA). Buscar actualizaciones. Aviso más fiable. Crear releases desde GitDog. Solo Apple Silicon |
| `1.2.1` | Destino del tag y avisos. Arrastrar archivos al release. Título del release como sugerencia. Hash correcto en tags anotados |
| `1.2.2` | Modal de conflictos de merge (continuar o cancelar) |
| `1.2.3` | Los nombres de tag aceptan `+` (por ejemplo `v1.0.0+1`) |

## 14. Preferencias del autor

- Habla español. La interfaz debe estar en español e inglés.
- Prefiere "merge" a "fusionar".
- Tema oscuro, elegante, estilo macOS. Le gusta el comportamiento de GitHub Desktop como referencia.
- Mensaje de commit por defecto con un archivo: `Update <archivo>`.
- Quiere que cada acción use la cuenta del proyecto. Prefiere publicar desde GitDog.
- Antes de acciones visibles para otros (publicar un release, aprobar o hacer merge de un PR, forzar un tag) hay que pedir confirmación. No usar ni extraer tokens guardados fuera de GitDog.
- No publicar datos personales en este repositorio público.
- Las notas de versión van en español e inglés.

## 15. Cómo retomar el trabajo

1. `git status` y `git log --oneline -n 5` para ver dónde se está.
2. `npm install` si falta `node_modules`. `npm run dev` para ver la app.
3. `npm run typecheck` antes de tocar nada, para saber que se parte de un estado correcto.
4. Leer las secciones 4 (arquitectura) y 9 (cómo agregar cosas) antes de cambiar la API o los textos.
5. Revisar la sección 12 para elegir el siguiente trabajo, y preguntar al autor cuál prefiere.
6. Para una versión nueva: sección 8.
