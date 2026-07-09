# Supported agents

This matrix mirrors `src-tauri/src/agent/definitions.rs`. Update both places when adding or changing an agent target.

## Transport and scope matrix

| Agent | ID | Project config | Global config | Transports | Optional fields |
| --- | --- | --- | --- | --- | --- |
| Antigravity | `antigravity` | Not supported | `~/.gemini/config/mcp_config.json` | stdio, HTTP, SSE | None |
| Cline VSCode Extension | `cline` | Not supported | VS Code global storage `cline_mcp_settings.json` | stdio, HTTP, SSE | None |
| Cline CLI | `cline-cli` | Not supported | `~/.cline/data/settings/cline_mcp_settings.json` | stdio, HTTP, SSE | None |
| Claude Code | `claude-code` | `.mcp.json` | `~/.claude.json` | stdio, HTTP, SSE | timeout, auto-approval |
| Claude Desktop | `claude-desktop` | Not supported | Claude Desktop app config | stdio | None |
| CodeWhale | `codewhale` | Not supported | `~/.codewhale/mcp.json` | stdio, HTTP, SSE | OAuth scopes |
| Codex | `codex` | `.codex/config.toml` | `$CODEX_HOME/config.toml` or `~/.codex/config.toml` | stdio, HTTP, SSE | auto-approval |
| CatPaw | `catpaw` | Not supported | CatPaw global storage settings | stdio, HTTP, SSE | None |
| Cursor | `cursor` | `.cursor/mcp.json` | `~/.cursor/mcp.json` | stdio, HTTP, SSE | OAuth scopes |
| DeepSeek Reasonix | `deepseek-reasonix` | `.reasonix/settings.json` | `~/.reasonix/config.json` | stdio, HTTP, SSE | None |
| Gemini CLI | `gemini-cli` | `.gemini/settings.json` | `~/.gemini/settings.json` | stdio, HTTP, SSE | timeout, OAuth scopes |
| Goose | `goose` | Not supported | Goose config path for the current OS | stdio, HTTP, SSE | None |
| GitHub Copilot CLI | `github-copilot-cli` | `.vscode/mcp.json` | `$XDG_CONFIG_HOME/.copilot/mcp-config.json` or `~/.copilot/mcp-config.json` | stdio, HTTP, SSE | None |
| Kiro | `kiro` | `.kiro/settings/mcp.json` | `~/.kiro/settings/mcp.json` | stdio, HTTP, SSE | OAuth scopes, auto-approval |
| Kimi Code | `kimi-code` | `.kimi-code/mcp.json` | `$KIMI_CODE_HOME/mcp.json` or `~/.kimi-code/mcp.json` | stdio, HTTP, SSE | timeout |
| MCPorter | `mcporter` | `config/mcporter.json` | `~/.mcporter/mcporter.json` | stdio, HTTP, SSE | None |
| MiMoCode | `mimocode` | `.mimocode/mimocode.json` | `$MIMOCODE_HOME/config/mimocode.json` or `~/.config/mimocode/mimocode.json` | stdio, HTTP, SSE | timeout, OAuth scopes |
| OpenCode | `opencode` | `opencode.json` | `~/.config/opencode/opencode.json` | stdio, HTTP, SSE | None |
| Qoder | `qoder` | `.qoder/settings.local.json` | `~/.qoder/settings.json` | stdio, HTTP, SSE | None |
| TRAE CN | `trae-cn` | `.trae/mcp.json` | `Trae CN/User/mcp.json` in platform app support | stdio, HTTP, SSE | None |
| TRAE International | `trae-international` | `.trae/mcp.json` | `Trae/User/mcp.json` in platform app support | stdio, HTTP, SSE | None |
| VS Code | `vscode` | `.vscode/mcp.json` | VS Code user `mcp.json` | stdio, HTTP, SSE | None |
| WorkBuddy | `workbuddy` | `.workbuddy/mcp.json` | `~/.workbuddy/mcp.json` | stdio, HTTP, SSE | None |
| Windsurf | `windsurf` | Not supported | `~/.codeium/windsurf/mcp_config.json` | stdio, HTTP, SSE | None |
| Zed | `zed` | `.zed/settings.json` | Zed app settings path for the current OS | stdio, HTTP, SSE | None |
| ZCode | `zcode` | `.zcode/config.json` | `~/.zcode/cli/config.json` | stdio, HTTP, SSE | None |

## Optional fields

Optional fields are capability-gated. If you install a server with an unsupported field, MCPM writes the supported parts and reports the skipped field in the install result.

- **timeout**: request or startup timeout, mapped to the target agent's native field
- **OAuth scopes**: remote authorization scopes for agents that expose an auth/scopes shape
- **auto-approval**: tool approval settings for agents that support pre-approved MCP tools

## Detection rules

Global detection checks whether the configured global path exists. Project detection checks the project-specific markers declared by each agent, such as `.cursor`, `.codex`, `.vscode`, `.mcp.json`, `.kiro`, or `opencode.json`.

Project installs require a selected project directory. Global installs write to user-level config paths.
