#!/bin/sh
# Builds the installers signed with Developer ID and notarized by Apple.
# Needs: an Apple Developer account, a "Developer ID Application" certificate in the login Keychain,
# and an app-specific password (appleid.apple.com > Sign-In and Security).
# Usage: npm run dist:signed   (it asks for what is missing; the password is never stored)
set -e
cd "$(dirname "$0")/.."

IDENTITY=$(security find-identity -v -p codesigning | sed -n 's/.*"\(Developer ID Application:[^"]*\)".*/\1/p' | head -1)
if [ -z "$IDENTITY" ]; then
  echo "No 'Developer ID Application' certificate found in your Keychain."
  echo "Create one in Xcode: Settings > Accounts > Manage Certificates > + > Developer ID Application."
  echo "'Apple Development' certificates cannot be used to distribute apps."
  exit 1
fi

[ -n "$APPLE_ID" ] || { printf "Apple ID (email): "; read -r APPLE_ID; }
[ -n "$APPLE_TEAM_ID" ] || { printf "Team ID: "; read -r APPLE_TEAM_ID; }
if [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ]; then
  printf "App-specific password (hidden): "
  stty -echo
  read -r APPLE_APP_SPECIFIC_PASSWORD
  stty echo
  echo
fi
export APPLE_ID APPLE_TEAM_ID APPLE_APP_SPECIFIC_PASSWORD
# electron-builder wants the name without the "Developer ID Application:" prefix.
export CSC_NAME="${IDENTITY#Developer ID Application: }"

echo "Signing with: $IDENTITY"
npm run build
npx electron-builder --mac --config electron-builder.signed.js
echo "Done. Installers are in dist/."
