// Signs the packaged app "ad hoc" (no certificate, no developer account).
// Without a complete signature, Macs with Apple Silicon often say the app is "damaged".
// This is not Apple notarization: other Macs still show a one-time warning (see README).
const { execFileSync } = require('child_process')
const path = require('path')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' })
}
