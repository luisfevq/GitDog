#!/bin/sh
# Regenerates resources/icon.png and resources/icon.icns from resources/icon-source.png.
# Usage: npm run icon
set -e
cd "$(dirname "$0")/.."

npx electron scripts/render-icon.js resources/icon-source.png resources/icon.png

rm -rf resources/icon.iconset
mkdir resources/icon.iconset
for s in 16 32 128 256 512; do
  sips -z "$s" "$s" resources/icon.png --out "resources/icon.iconset/icon_${s}x${s}.png" >/dev/null
  d=$((s * 2))
  sips -z "$d" "$d" resources/icon.png --out "resources/icon.iconset/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns resources/icon.iconset -o resources/icon.icns
rm -rf resources/icon.iconset
echo "Icon updated."
