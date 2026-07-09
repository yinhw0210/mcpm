# macOS Helper DMG

MCPM is not signed and notarized yet. Some macOS systems may show a message that the app is damaged after it is downloaded from the internet. This is usually caused by the `com.apple.quarantine` attribute, not by a corrupted download.

The long-term fix is Developer ID signing and Apple notarization. Until then, release builds can publish an additional `*_with-helper.dmg` package.

## User Flow

The helper DMG contains:

- `MCPM.app`
- `Applications`
- `Repair MCPM.command`
- `README.txt`

Users should drag `MCPM.app` into Applications first. If macOS reports that the app is damaged, users can double-click `Repair MCPM.command`. The script only runs:

```bash
xattr -dr com.apple.quarantine /Applications/MCPM.app
open /Applications/MCPM.app
```

It does not disable Gatekeeper and does not change system-wide security settings.

## Build Flow

The Release workflow keeps the default Tauri DMG and also uploads a helper DMG for each macOS architecture:

- `MCPM_<version>_aarch64_with-helper.dmg`
- `MCPM_<version>_x64_with-helper.dmg`

The helper DMG is generated after `tauri-apps/tauri-action` completes. The script copies the `.app` bundle into a temporary staging directory, adds the helper script and README, creates an Applications symlink, and then runs `hdiutil create`.

## Files

- `scripts/macos/repair-mcpm.command`: double-click helper for end users.
- `scripts/macos/create-helper-dmg.sh`: CI script that creates the helper DMG.
- `.github/workflows/release.yml`: uploads the helper DMG to the draft release.

## Limitations

This is a release convenience for unsigned builds. It is not a substitute for signing and notarization. Once MCPM has Apple Developer ID signing and notarization, the helper DMG should either be removed or kept only as a fallback asset for development builds.
