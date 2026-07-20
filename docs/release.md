# Release Guide

This guide is for maintainers publishing MCPM builds to GitHub Releases.

## Recommended workflow

Use GitHub Actions to build macOS and Windows packages, then publish a draft release with the generated assets. This keeps the release environment clean and avoids trying to cross-compile desktop installers from one local machine.

GitHub CLI is still worth installing locally because it makes the release loop faster:

- create and inspect releases without leaving the terminal
- upload or replace installer assets
- publish a draft after checking the generated files
- reuse the release note stored in this repository

## Install GitHub CLI

macOS:

```bash
brew install gh
```

Windows:

```powershell
winget install --id GitHub.cli
```

Then sign in:

```bash
gh auth login
```

## Version checklist

Before cutting a release, update these files to the same version:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json`
- `CHANGELOG.md`
- `docs/releases/vX.Y.Z.md`

For example, the `0.1.1` release note is stored at [docs/releases/v0.1.1.md](releases/v0.1.1.md).

## Create a release with GitHub CLI

Set the tag once, then create a draft release from the repository root:

```bash
VERSION=v0.1.1
gh release create "$VERSION" \
  --draft \
  --title "MCPM $VERSION" \
  --notes-file "docs/releases/$VERSION.md"
```

Attach local build assets if you built packages manually:

```bash
gh release upload "$VERSION" src-tauri/target/release/bundle/dmg/*.dmg
gh release upload "$VERSION" src-tauri/target/release/bundle/msi/*.msi
gh release upload "$VERSION" src-tauri/target/release/bundle/nsis/*setup.exe
```

Unsigned macOS builds can trigger Gatekeeper quarantine prompts. Do not ship a double-click repair script inside the DMG; macOS may quarantine and block the script itself. Link users to [macOS Install Troubleshooting](macos-install-troubleshooting.md) until the app is signed and notarized.

Publish the draft after checking the release page:

```bash
gh release edit "$VERSION" --notes-file "docs/releases/$VERSION.md" --draft=false
```

## Manual GitHub release

If you prefer the web UI, open the repository on GitHub, choose **Releases**, select the release tag, use `MCPM vX.Y.Z` as the title, paste the matching file from `docs/releases/`, upload the built installers, and publish when everything looks right.

Keep the release note in the repository even if the final release is published through the GitHub UI. The GitHub page is the public announcement; the checked-in file is the source of truth for future maintainers.
