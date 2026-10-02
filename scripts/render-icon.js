// Draws resources/icon-source.png inside the macOS icon shape (1024 canvas, 824 body, rounded corners)
// and writes a transparent 1024px PNG. Run by scripts/make-icon.sh with Electron.
const { app, BrowserWindow } = require('electron')
const fs = require('fs')

const [source, out] = process.argv.slice(-2)
const SIZE = 1024
const BODY = 824
const OFFSET = (SIZE - BODY) / 2

app.disableHardwareAcceleration()
app.whenReady().then(async () => {
  const data = fs.readFileSync(source).toString('base64')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    <defs>
      <clipPath id="body"><rect x="${OFFSET}" y="${OFFSET}" width="${BODY}" height="${BODY}" rx="185"/></clipPath>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#000" flood-opacity="0.45"/>
      </filter>
    </defs>
    <rect x="${OFFSET}" y="${OFFSET}" width="${BODY}" height="${BODY}" rx="185" fill="#1c1c20" filter="url(#shadow)"/>
    <g clip-path="url(#body)">
      <image href="data:image/png;base64,${data}" x="${OFFSET}" y="${OFFSET}" width="${BODY}" height="${BODY}" preserveAspectRatio="xMidYMid slice"/>
    </g>
    <rect x="${OFFSET + 1}" y="${OFFSET + 1}" width="${BODY - 2}" height="${BODY - 2}" rx="184" fill="none" stroke="#fff" stroke-opacity="0.08" stroke-width="2"/>
  </svg>`

  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    useContentSize: true,
    show: false,
    transparent: true,
    frame: false,
    webPreferences: { offscreen: true }
  })
  await win.loadURL(
    'data:text/html,' +
      encodeURIComponent(`<body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${SIZE}" height="${SIZE}" style="display:block"></body>`)
  )
  await new Promise((resolve) => setTimeout(resolve, 800))
  const image = await win.webContents.capturePage()
  const sized = image.getSize().width === SIZE ? image : image.resize({ width: SIZE, height: SIZE, quality: 'best' })
  fs.writeFileSync(out, sized.toPNG())
  app.quit()
})
