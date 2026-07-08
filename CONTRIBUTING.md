# Contributing to MCP Manager

Thanks for helping improve MCP Manager. This project edits real AI agent configuration files, so changes should be small, tested, and clear about user impact.

## Set up the project

Install the frontend and Tauri dependencies:

```bash
pnpm install
```

Run the desktop app in development:

```bash
pnpm tauri dev
```

## Check your changes

Run these checks before opening a pull request:

```bash
pnpm run typecheck
pnpm run build
cd src-tauri
cargo test
```

Run `pnpm tauri dev` for UI changes and check the relevant workflow manually.

## Development guidelines

- Keep agent config changes grounded in the target agent's current schema
- Add or update Rust tests when changing source parsing, transforms, sync, or config IO
- Keep UI copy direct and bilingual when the visible surface already has Chinese and English text
- Do not commit generated output from `dist/`, `src-tauri/target/`, or TypeScript build info files
- Do not store real API keys, tokens, or private MCP headers in fixtures or screenshots

## Pull request checklist

- The change has a focused description
- The affected workflow has been tested
- Screenshots or screen recordings are included for visible UI changes
- New agents or config formats are documented in `docs/supported-agents.md`
- Security-sensitive behavior is called out in the PR description

## Reporting bugs

Use the bug report template and include:

- Operating system
- Agent target and install scope
- MCP source type: URL, package, command, or path
- Expected config output
- Actual config output or error message

Avoid posting secrets. Redact tokens, headers, and private URLs before sharing logs.
