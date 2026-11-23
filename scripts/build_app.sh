#!/usr/bin/env bash
# Builds build/GNNLab.app: a thin SwiftUI + WKWebView shell (app/) around the course in web/.
# Usage: ./scripts/build_app.sh && open build/GNNLab.app
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/build/GNNLab.app"
RES="$APP/Contents/Resources"

# The Command Line Tools toolchain can't start the new SwiftPM build system,
# so fall back to the native one when it fails.
SWIFT_FLAGS=(-c release --package-path "$ROOT/app")
if ! swift build "${SWIFT_FLAGS[@]}" 2>/dev/null; then
    SWIFT_FLAGS+=(--build-system native)
    swift build "${SWIFT_FLAGS[@]}"
fi
BIN="$(swift build "${SWIFT_FLAGS[@]}" --show-bin-path)"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$RES"
cp "$BIN/GNNLab" "$APP/Contents/MacOS/GNNLab"

# The course itself: web/ is the single source of truth, copied in verbatim.
rsync -a --exclude '.DS_Store' "$ROOT/web/" "$RES/web/"

ICONSET="$ROOT/build/AppIcon.iconset"
rm -rf "$ICONSET"
swift "$ROOT/scripts/make_icon.swift" "$ROOT/web/icons/maskable-512.png" "$ICONSET"
iconutil -c icns "$ICONSET" -o "$RES/AppIcon.icns"

# CFBundleVersion tracks the course content version, so About shows which build you have.
COURSE_VERSION="$(sed -n "s/^self.COURSE_VERSION = '\(.*\)';$/\1/p" "$ROOT/web/files.js")"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key><string>GNN Lab</string>
    <key>CFBundleDisplayName</key><string>GNN Lab</string>
    <key>CFBundleIdentifier</key><string>com.venkatacrc.gnnlab</string>
    <key>CFBundleExecutable</key><string>GNNLab</string>
    <key>CFBundleIconFile</key><string>AppIcon</string>
    <key>CFBundlePackageType</key><string>APPL</string>
    <key>CFBundleShortVersionString</key><string>1.0.0</string>
    <key>CFBundleVersion</key><string>${COURSE_VERSION:-1}</string>
    <key>LSMinimumSystemVersion</key><string>14.0</string>
    <key>LSApplicationCategoryType</key><string>public.app-category.education</string>
    <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

codesign --force --sign - "$APP" >/dev/null 2>&1 || true
echo "Built $APP (course $COURSE_VERSION)"
