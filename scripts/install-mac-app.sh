#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_SRC="$PROJECT_DIR/dist_build/mac-arm64/APlayer.app"
APP_DEST="/Applications/APlayer.app"

cd "$PROJECT_DIR"

echo "==> 1. Building APlayer for macOS Apple Silicon (arm64)..."
pnpm build:mac

echo "==> 2. Clearing quarantine attributes & applying native ad-hoc signature..."
xattr -cr "$APP_SRC"
codesign --force --deep --sign - "$APP_SRC"
codesign --verify --deep --strict --verbose=2 "$APP_SRC"

echo "==> 3. Closing any running APlayer instance..."
osascript -e 'tell application "APlayer" to quit' 2>/dev/null || true
sleep 0.5

echo "==> 4. Installing into $APP_DEST..."
rm -rf "$APP_DEST"
ditto "$APP_SRC" "$APP_DEST"
xattr -cr "$APP_DEST"

echo "==> 5. Registering with macOS LaunchServices (Spotlight / Launchpad / Finder)..."
LSREGISTER="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"
if [[ -x "$LSREGISTER" ]]; then
  "$LSREGISTER" -f "$APP_DEST"
fi

echo "==> Done! APlayer.app is installed at $APP_DEST"
