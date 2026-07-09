#!/bin/bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <app-path> <output-dmg> <volume-name>" >&2
  exit 2
fi

APP_PATH="$1"
OUTPUT_DMG="$2"
VOLUME_NAME="$3"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HELPER_SCRIPT="$SCRIPT_DIR/repair-mcpm.command"

if [[ ! -d "$APP_PATH" ]]; then
  echo "App bundle not found: $APP_PATH" >&2
  exit 1
fi

if [[ ! -f "$HELPER_SCRIPT" ]]; then
  echo "Helper script not found: $HELPER_SCRIPT" >&2
  exit 1
fi

STAGING_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$STAGING_DIR"
}
trap cleanup EXIT

APP_NAME="$(basename "$APP_PATH")"

cp -R "$APP_PATH" "$STAGING_DIR/$APP_NAME"
cp "$HELPER_SCRIPT" "$STAGING_DIR/Repair MCPM.command"
chmod +x "$STAGING_DIR/Repair MCPM.command"
ln -s /Applications "$STAGING_DIR/Applications"

cat > "$STAGING_DIR/README.txt" <<'EOF'
MCPM for macOS
==============

Install:
1. Drag MCPM.app to Applications.
2. Open MCPM from Applications.

If macOS says "MCPM is damaged and can't be opened":
1. Keep MCPM.app in Applications.
2. Double-click "Repair MCPM.command".

This helper only removes the download quarantine attribute from /Applications/MCPM.app.
It does not disable Gatekeeper or change system-wide security settings.

中文说明
--------
安装：
1. 将 MCPM.app 拖入 Applications（应用程序）。
2. 从应用程序中打开 MCPM。

如果 macOS 提示“MCPM 已损坏，无法打开”：
1. 确认 MCPM.app 已在 Applications（应用程序）中。
2. 双击 “Repair MCPM.command”。

该脚本只会移除 /Applications/MCPM.app 的下载隔离属性。
它不会关闭 Gatekeeper，也不会修改系统级安全设置。
EOF

mkdir -p "$(dirname "$OUTPUT_DMG")"
rm -f "$OUTPUT_DMG"
hdiutil create \
  -volname "$VOLUME_NAME" \
  -srcfolder "$STAGING_DIR" \
  -ov \
  -format UDZO \
  "$OUTPUT_DMG"
