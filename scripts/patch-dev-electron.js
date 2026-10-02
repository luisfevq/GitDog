// In development, macOS shows the name and icon of node_modules/electron's Electron.app.
// This renames it to GitDog and swaps the icon. It only touches node_modules and is safe to run again.
// The packaged app (npm run dist) gets its name and icon from electron-builder, not from here.
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

if (process.platform !== 'darwin') process.exit(0)

const root = path.join(__dirname, '..')
const app = path.join(root, 'node_modules/electron/dist/Electron.app')
const plist = path.join(app, 'Contents/Info.plist')
const icon = path.join(root, 'resources/icon.icns')
const target = path.join(app, 'Contents/Resources/electron.icns')

if (!fs.existsSync(plist) || !fs.existsSync(icon)) process.exit(0)

const read = (key) => {
  try {
    return execFileSync('plutil', ['-extract', key, 'raw', '-o', '-', plist], { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

let changed = false
for (const key of ['CFBundleName', 'CFBundleDisplayName']) {
  if (read(key) !== 'GitDog') {
    execFileSync('plutil', ['-replace', key, '-string', 'GitDog', plist])
    changed = true
  }
}
if (!fs.existsSync(target) || !fs.readFileSync(target).equals(fs.readFileSync(icon))) {
  fs.copyFileSync(icon, target)
  changed = true
}

if (changed) {
  // Changing the bundle breaks its signature. Sign it again (ad hoc) so macOS keeps running it.
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'ignore' })
  execFileSync('touch', [app])
  // macOS keeps the old name in its LaunchServices cache. Register the app again so the Dock reads the new one.
  const lsregister =
    '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister'
  if (fs.existsSync(lsregister)) execFileSync(lsregister, ['-f', app], { stdio: 'ignore' })
  console.log('Electron.app renamed to GitDog for development.')
}
