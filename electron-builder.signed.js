// Release build: signed with a "Developer ID Application" certificate and notarized by Apple.
// Used by `npm run dist:signed` (scripts/dist-signed.sh). The normal `npm run dist` stays ad hoc.
const base = require('./package.json').build

module.exports = {
  ...base,
  afterPack: undefined, // the ad-hoc signing step is not needed here
  mac: {
    ...base.mac,
    identity: undefined, // the certificate is chosen with CSC_NAME
    hardenedRuntime: true,
    gatekeeperAssess: false,
    notarize: true // reads APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD and APPLE_TEAM_ID
  }
}
