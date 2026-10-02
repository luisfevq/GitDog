# GitDog

Cliente Git de escritorio (macOS) con varias cuentas de GitHub. Electron + React + TypeScript.

## Comandos

```bash
npm install
npm run dev        # desarrollo
npm run dist       # genera el .dmg en dist/
```

## Cómo funciona

- Cada cuenta tiene un token guardado cifrado (Keychain de macOS, vía `safeStorage`) en `secrets.json`.
- Cada proyecto pertenece a una cuenta. Push, pull y clone usan solo el token de esa cuenta
  (`GIT_ASKPASS`, sin tocar `~/.gitconfig`). Los commits usan el nombre y email de esa cuenta.
- `config.json` (cuentas y proyectos, sin secretos) está separado de `secrets.json`, así se podrá sincronizar
  entre Macs más adelante sin copiar tokens.

## Estructura

- `src/main`: proceso principal (`git.ts`, `github.ts`, `store.ts`, `ipc.ts`)
- `src/preload`: puente seguro hacia la interfaz
- `src/shared/types.ts`: tipos y lista de métodos de la API
- `src/renderer`: interfaz React

## Pendiente

- Login por navegador (OAuth device flow) en lugar de pegar un token.
- Sincronizar `config.json` por iCloud Drive entre Macs.
- Resolver conflictos, stash, pull requests.
