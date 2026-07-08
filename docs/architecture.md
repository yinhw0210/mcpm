# MCPM architecture

This document explains how MCPM turns one MCP server source into native agent configuration, registry installs, status checks, and debug sessions.

## Product shape

MCPM has a Tauri backend and a React frontend. React owns the visual workflow, stores UI state in Zustand, and calls backend commands through `src/lib/tauri.ts`. Rust owns agent detection, config transforms, file writes, registry queries, runtime detection, and managed child processes.

## Relationship to add-mcp

MCPM is based on the design of [neon-solutions/add-mcp](https://github.com/neon-solutions/add-mcp). The upstream project focuses on a command-line interface for adding, finding, listing, removing, and synchronizing MCP server configs. This project keeps the same core ideas:

- Parse one input source into a canonical server identity
- Declare each agent's config path, format, supported transports, and optional fields
- Transform a canonical MCP config into the native schema each agent expects
- Remove and synchronize servers by stable identity rather than display name
- Search registry-compatible server catalogs before installation

MCPM extends that foundation with a desktop UI, global and project install forms, a dashboard, live process logs, JSON-RPC debugging, runtime discovery, tray integration, and bilingual copy.

## Source parsing

`src-tauri/src/source/mod.rs` classifies user input as one of three source types:

- **Remote**: `http://` or `https://` URL, installed as streamable HTTP or SSE
- **Package**: npm-style package name, installed through `npx -y package_name`
- **Command**: command line or filesystem path, installed as stdio

The parser also infers a default server name from hostnames, package names, command arguments, or filenames. The inferred name can be overridden in the install form.

## Agent model

`src-tauri/src/agent/definitions.rs` is the support matrix. Each agent definition includes:

- Agent id and display name
- Global config path
- Optional project config path
- Project detection paths
- Config key, including nested keys
- File format: JSON, YAML, or TOML
- Supported transports: stdio, HTTP, SSE
- Optional field support: timeout, OAuth scopes, auto-approval

The frontend reads this through `list_all_agents` and `get_agents_with_servers`, then shows installed and not-installed targets in the MCP management view.

## Config transforms

`src-tauri/src/agent/transform.rs` maps one canonical `McpServerConfig` into each agent's native shape. Most agents use a standard `{ command, args, env }` or `{ type, url, headers }` shape, but some need custom fields:

- Codex stores remote headers under `http_headers` and can write approval modes
- Goose uses `extensions` entries with `cmd`, `envs`, `uri`, and `enabled`
- Zed stores custom context servers under `context_servers`
- OpenCode stores local commands as an array and uses `environment`
- Kiro maps auto-approved tools to `autoApprove`
- GitHub Copilot CLI uses a different project schema under `.vscode/mcp.json`

Before writing, `apply_field_support` drops optional fields that a target agent does not support. The frontend shows those drops as warnings after installation.

## Config file IO

`src-tauri/src/format/` reads and writes JSON, YAML, and TOML without replacing unrelated config content. The utilities support nested keys such as `mcpServers`, `servers`, `mcp`, `extensions`, and `context_servers`.

Server identity comes from stable connection data. Remote servers use `url`, `uri`, or `serverUrl`. Stdio servers use package names for `npx`/`bunx`, or the command plus arguments for other commands. Sync uses that identity to group the same server across agents.

## Registry search

`src-tauri/src/registry/mod.rs` queries two registry-compatible sources:

- `https://add-mcp.com/registry/api/v1/servers`
- `https://registry.modelcontextprotocol.io/v0.1/servers`

Results are deduplicated by name and version, ranked by source quality and search relevance, then returned to the registry page. The install flow can prefill remote URL, headers, environment variables, runtime arguments, and package arguments from registry metadata.

## Process debugging

`src-tauri/src/process/manager.rs` manages stdio MCP server debug sessions. It starts child processes with an augmented runtime `PATH`, captures stdout and stderr, emits log events to the frontend, reports PID/uptime/CPU/memory, and can send JSON-RPC messages through stdin using the MCP `Content-Length` framing.

Remote servers do not need a managed process. The dashboard probes remote URLs with a short HTTP request and reports reachability.

## Frontend flow

The main UI lives in these pages:

- `src/pages/Dashboard.tsx`: status overview, remote reachability, managed debug sessions, and activity log
- `src/pages/McpManager.tsx`: server-first view for enabling or disabling a server across agents
- `src/pages/ConfigManager.tsx`: agent-first view for inspecting each agent's global and project configs
- `src/pages/RegistrySearch.tsx`: registry search and install-prefill flow
- `src/pages/ServerDetail.tsx`: live logs, managed process controls, and JSON-RPC input
- `src/pages/Settings.tsx`: auto-start setting and runtime detection

`src/stores/agentStore.ts`, `src/stores/serverStore.ts`, `src/stores/languageStore.ts`, and `src/stores/settingsStore.ts` keep the UI decoupled from direct Tauri calls.

## Trust boundaries

MCPM writes to user and project configuration files, starts local child processes during debugging, and can store headers or environment values in config files. Treat MCP server sources as executable integrations. Review generated configs, avoid committing secrets, and debug only servers you trust.
