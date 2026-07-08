# Security policy

MCP Manager writes local agent configuration files and can start MCP server processes during debugging. Treat reports about config writes, command execution, secret handling, and registry metadata as security-sensitive.

## Supported versions

The project is pre-1.0. Security fixes target the latest commit on the main development branch until release channels exist.

## Report a vulnerability

Please do not open a public issue for a vulnerability.

Use GitHub private vulnerability reporting if it is enabled for the repository. If it is not enabled yet, contact the maintainer through the GitHub profile associated with the repository and include a minimal, redacted reproduction.

Helpful reports include:

- Affected operating system
- Affected agent target
- MCP source input
- Generated config path and redacted output
- Steps to reproduce
- Expected behavior and actual behavior

Do not include real API keys, bearer tokens, cookies, or private registry URLs.

## Scope

Security reports may include:

- Unsafe command execution during stdio debugging
- Incorrect writes outside the intended config path
- Secret leakage in logs, screenshots, or generated configs
- Registry metadata that causes unsafe generated commands
- Sync or remove behavior that corrupts unrelated config

Feature requests and non-sensitive bugs can use public issues.
