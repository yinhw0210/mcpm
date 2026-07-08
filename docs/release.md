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
- `src-tauri/tauri.conf.json`
- `CHANGELOG.md`
- `docs/releases/vX.Y.Z.md`

For `0.1.0`, the release note is stored at [docs/releases/v0.1.0.md](releases/v0.1.0.md).

## Create a release with GitHub CLI

Create a draft release from the repository root:

```bash
gh release create v0.1.0 \
  --draft \
  --title "MCPM v0.1.0" \
  --notes-file docs/releases/v0.1.0.md
```

Attach local build assets if you built packages manually:

```bash
gh release upload v0.1.0 src-tauri/target/release/bundle/dmg/*.dmg
gh release upload v0.1.0 src-tauri/target/release/bundle/msi/*.msi
gh release upload v0.1.0 src-tauri/target/release/bundle/nsis/*setup.exe
```

Publish the draft after checking the release page:

```bash
gh release edit v0.1.0 --draft=false
```

## Manual GitHub release

If you prefer the web UI, open the repository on GitHub, choose **Releases**, create tag `v0.1.0`, set the title to `MCPM v0.1.0`, paste the contents of `docs/releases/v0.1.0.md`, upload the built installers, and publish when everything looks right.

Keep the release note in the repository even if the final release is published through the GitHub UI. The GitHub page is the public announcement; the checked-in file is the source of truth for future maintainers.
