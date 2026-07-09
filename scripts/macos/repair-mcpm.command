#!/bin/zsh
set -euo pipefail

APP_PATH="/Applications/MCPM.app"

echo "MCPM macOS helper"
echo "=================="
echo ""
echo "This helper removes the macOS download quarantine attribute from:"
echo "$APP_PATH"
echo ""
echo "It does not disable Gatekeeper and does not change system security settings."
echo ""

if [[ ! -d "$APP_PATH" ]]; then
  echo "MCPM is not installed in /Applications yet."
  echo "Please drag MCPM.app to the Applications folder first, then run this helper again."
  echo ""
  echo "未找到 /Applications/MCPM.app。请先把 MCPM.app 拖入“应用程序”文件夹，然后再次运行此脚本。"
  echo ""
  read -r "reply?Press Enter to close..."
  exit 1
fi

echo "Removing quarantine attribute..."
if /usr/bin/xattr -dr com.apple.quarantine "$APP_PATH" 2>/dev/null; then
  echo "Done."
else
  echo "Permission is required. macOS may ask for your administrator password."
  /usr/bin/sudo /usr/bin/xattr -dr com.apple.quarantine "$APP_PATH"
  echo "Done."
fi

echo ""
echo "Opening MCPM..."
/usr/bin/open "$APP_PATH"
echo ""
echo "If MCPM opened successfully, you can close this window."
echo "如果 MCPM 已成功打开，可以关闭此窗口。"
echo ""
read -r "reply?Press Enter to close..."
