// Agent 配置转换：将统一的 McpServerConfig 转换为各 Agent 的原生 schema
// 参考: add-mcp/src/agents.ts 中的各 transformConfig 函数

use super::types::*;
use serde_json::{json, Map, Value};

/// 构建标准远程配置: { type?, url, headers?, timeout? }
fn build_standard_remote(config: &McpServerConfig) -> Value {
    let mut remote = Map::new();
    if let Some(t) = &config.r#type {
        remote.insert(
            "type".to_string(),
            Value::String(match t {
                TransportType::Http => "http".to_string(),
                TransportType::Sse => "sse".to_string(),
            }),
        );
    }
    if let Some(url) = &config.url {
        remote.insert("url".to_string(), Value::String(url.clone()));
    }
    if let Some(headers) = &config.headers {
        if !headers.is_empty() {
            remote.insert("headers".to_string(), json!(headers));
        }
    }
    if let Some(timeout) = config.timeout {
        remote.insert("timeout".to_string(), json!(timeout));
    }
    Value::Object(remote)
}

/// 构建标准本地配置: { command, args, env? }
fn build_standard_local(config: &McpServerConfig) -> Value {
    let mut local = Map::new();
    if let Some(cmd) = &config.command {
        local.insert("command".to_string(), Value::String(cmd.clone()));
    }
    local.insert(
        "args".to_string(),
        json!(config.args.clone().unwrap_or_default()),
    );
    if let Some(env) = &config.env {
        if !env.is_empty() {
            local.insert("env".to_string(), json!(env));
        }
    }
    Value::Object(local)
}

/// 标准转换（Claude Code, Claude Desktop, VS Code, MCPorter）
fn transform_standard(_server_name: &str, config: &McpServerConfig) -> Value {
    if config.is_remote() {
        build_standard_remote(config)
    } else {
        build_standard_local(config)
    }
}

/// Gemini CLI 转换
fn transform_gemini(_server_name: &str, config: &McpServerConfig) -> Value {
    if !config.is_remote() {
        return build_standard_local(config);
    }
    let mut remote = match build_standard_remote(config) {
        Value::Object(map) => map,
        _ => Map::new(),
    };
    if let Some(scopes) = &config.oauth_scopes {
        if !scopes.is_empty() {
            remote.insert("oauth".to_string(), json!({ "scopes": scopes }));
        }
    }
    Value::Object(remote)
}

/// Goose 转换
fn transform_goose(server_name: &str, config: &McpServerConfig) -> Value {
    if config.is_remote() {
        let goose_type = if matches!(config.r#type, Some(TransportType::Sse)) {
            "sse"
        } else {
            "streamable_http"
        };
        json!({
            "name": server_name,
            "description": "",
            "type": goose_type,
            "uri": config.url,
            "headers": config.headers.clone().unwrap_or_default(),
            "enabled": true,
            "timeout": 300
        })
    } else {
        json!({
            "name": server_name,
            "description": "",
            "cmd": config.command,
            "args": config.args.clone().unwrap_or_default(),
            "enabled": true,
            "envs": config.env.clone().unwrap_or_default(),
            "type": "stdio",
            "timeout": 300
        })
    }
}

/// Zed 转换
fn transform_zed(_server_name: &str, config: &McpServerConfig) -> Value {
    if config.is_remote() {
        json!({
            "source": "custom",
            "type": match config.r#type {
                Some(TransportType::Sse) => "sse",
                _ => "http",
            },
            "url": config.url,
            "headers": config.headers.clone().unwrap_or_default()
        })
    } else {
        json!({
            "source": "custom",
            "command": config.command,
            "args": config.args.clone().unwrap_or_default(),
            "env": config.env.clone().unwrap_or_default()
        })
    }
}

/// OpenCode 转换
fn transform_opencode(_server_name: &str, config: &McpServerConfig) -> Value {
    if config.is_remote() {
        json!({
            "type": "remote",
            "url": config.url,
            "enabled": true,
            "headers": config.headers
        })
    } else {
        let mut command = vec![config.command.clone().unwrap_or_default()];
        command.extend(config.args.clone().unwrap_or_default());
        json!({
            "type": "local",
            "command": command,
            "enabled": true,
            "environment": config.env.clone().unwrap_or_default()
        })
    }
}

/// CodeWhale 转换
fn transform_codewhale(_server_name: &str, config: &McpServerConfig) -> Value {
    if config.is_remote() {
        let mut remote = Map::new();
        if let Some(url) = &config.url {
            remote.insert("url".to_string(), Value::String(url.clone()));
        }
        if matches!(config.r#type, Some(TransportType::Sse)) {
            remote.insert("transport".to_string(), Value::String("sse".to_string()));
        }
        if let Some(headers) = &config.headers {
            if !headers.is_empty() {
                remote.insert("headers".to_string(), json!(headers));
            }
        }
        if let Some(scopes) = &config.oauth_scopes {
            if !scopes.is_empty() {
                remote.insert("scopes".to_string(), json!(scopes));
            }
        }
        remote.insert("disabled".to_string(), Value::Bool(false));
        return Value::Object(remote);
    }

    let mut local = Map::new();
    if let Some(cmd) = &config.command {
        local.insert("command".to_string(), Value::String(cmd.clone()));
    }
    local.insert(
        "args".to_string(),
        json!(config.args.clone().unwrap_or_default()),
    );
    if let Some(env) = &config.env {
        if !env.is_empty() {
            local.insert("env".to_string(), json!(env));
        }
    }
    local.insert("disabled".to_string(), Value::Bool(false));
    Value::Object(local)
}

/// MiMoCode 转换
fn transform_mimocode(_server_name: &str, config: &McpServerConfig) -> Value {
    if config.is_remote() {
        let mut remote = Map::new();
        remote.insert("type".to_string(), Value::String("remote".to_string()));
        if let Some(url) = &config.url {
            remote.insert("url".to_string(), Value::String(url.clone()));
        }
        remote.insert("enabled".to_string(), Value::Bool(true));
        if let Some(headers) = &config.headers {
            if !headers.is_empty() {
                remote.insert("headers".to_string(), json!(headers));
            }
        }
        if let Some(timeout) = config.timeout {
            remote.insert("timeout".to_string(), json!(timeout));
        }
        if let Some(scopes) = &config.oauth_scopes {
            if !scopes.is_empty() {
                remote.insert("oauth".to_string(), json!({ "scope": scopes.join(" ") }));
            }
        }
        return Value::Object(remote);
    }

    let mut command = Vec::new();
    if let Some(cmd) = &config.command {
        command.push(cmd.clone());
    }
    command.extend(config.args.clone().unwrap_or_default());

    let mut local = Map::new();
    local.insert("type".to_string(), Value::String("local".to_string()));
    local.insert("command".to_string(), json!(command));
    local.insert("enabled".to_string(), Value::Bool(true));
    if let Some(env) = &config.env {
        if !env.is_empty() {
            local.insert("environment".to_string(), json!(env));
        }
    }
    if let Some(timeout) = config.timeout {
        local.insert("timeout".to_string(), json!(timeout));
    }
    Value::Object(local)
}

/// Kimi Code 转换
fn transform_kimi_code(_server_name: &str, config: &McpServerConfig) -> Value {
    let mut target = if config.is_remote() {
        let mut remote = Map::new();
        if let Some(url) = &config.url {
            remote.insert("url".to_string(), Value::String(url.clone()));
        }
        if matches!(config.r#type, Some(TransportType::Sse)) {
            remote.insert("transport".to_string(), Value::String("sse".to_string()));
        }
        if let Some(headers) = &config.headers {
            if !headers.is_empty() {
                remote.insert("headers".to_string(), json!(headers));
            }
        }
        remote
    } else {
        let mut local = Map::new();
        if let Some(cmd) = &config.command {
            local.insert("command".to_string(), Value::String(cmd.clone()));
        }
        local.insert(
            "args".to_string(),
            json!(config.args.clone().unwrap_or_default()),
        );
        if let Some(env) = &config.env {
            if !env.is_empty() {
                local.insert("env".to_string(), json!(env));
            }
        }
        local
    };

    target.insert("enabled".to_string(), Value::Bool(true));
    if let Some(timeout) = config.timeout {
        target.insert("startupTimeoutMs".to_string(), json!(timeout));
    }

    Value::Object(target)
}

/// Codex 审批配置
fn apply_codex_approval(
    mut target: Map<String, Value>,
    auto_approve_tools: &Option<Vec<String>>,
) -> Value {
    if let Some(tools) = auto_approve_tools {
        if tools.is_empty() {
            target.insert(
                "default_tools_approval_mode".to_string(),
                Value::String("approve".to_string()),
            );
        } else {
            let tools_map: Map<String, Value> = tools
                .iter()
                .map(|t| (t.clone(), json!({ "approval_mode": "approve" })))
                .collect();
            target.insert("tools".to_string(), Value::Object(tools_map));
        }
    }
    Value::Object(target)
}

/// Codex 转换
fn transform_codex(_server_name: &str, config: &McpServerConfig) -> Value {
    if config.is_remote() {
        let mut remote = Map::new();
        remote.insert(
            "type".to_string(),
            Value::String(
                match config.r#type {
                    Some(TransportType::Sse) => "sse",
                    _ => "http",
                }
                .to_string(),
            ),
        );
        if let Some(url) = &config.url {
            remote.insert("url".to_string(), Value::String(url.clone()));
        }
        if let Some(headers) = &config.headers {
            if !headers.is_empty() {
                remote.insert("http_headers".to_string(), json!(headers));
            }
        }
        return apply_codex_approval(remote, &config.auto_approve_tools);
    }

    let mut local = Map::new();
    if let Some(cmd) = &config.command {
        local.insert("command".to_string(), Value::String(cmd.clone()));
    }
    local.insert(
        "args".to_string(),
        json!(config.args.clone().unwrap_or_default()),
    );
    if let Some(env) = &config.env {
        local.insert("env".to_string(), json!(env));
    }
    apply_codex_approval(local, &config.auto_approve_tools)
}

/// Cursor 转换
fn transform_cursor(_server_name: &str, config: &McpServerConfig) -> Value {
    if config.is_remote() {
        let mut remote = Map::new();
        if let Some(url) = &config.url {
            remote.insert("url".to_string(), Value::String(url.clone()));
        }
        if let Some(headers) = &config.headers {
            if !headers.is_empty() {
                remote.insert("headers".to_string(), json!(headers));
            }
        }
        if let Some(scopes) = &config.oauth_scopes {
            if !scopes.is_empty() {
                remote.insert("auth".to_string(), json!({ "scopes": scopes }));
            }
        }
        return Value::Object(remote);
    }
    build_standard_local(config)
}

/// Kiro 转换
fn transform_kiro(_server_name: &str, config: &McpServerConfig) -> Value {
    let mut target = if config.is_remote() {
        let mut remote = Map::new();
        if let Some(url) = &config.url {
            remote.insert("url".to_string(), Value::String(url.clone()));
        }
        if let Some(headers) = &config.headers {
            if !headers.is_empty() {
                remote.insert("headers".to_string(), json!(headers));
            }
        }
        if let Some(scopes) = &config.oauth_scopes {
            remote.insert("oauthScopes".to_string(), json!(scopes));
        }
        remote
    } else {
        let mut local = Map::new();
        if let Some(cmd) = &config.command {
            local.insert("command".to_string(), Value::String(cmd.clone()));
        }
        local.insert(
            "args".to_string(),
            json!(config.args.clone().unwrap_or_default()),
        );
        if let Some(env) = &config.env {
            if !env.is_empty() {
                local.insert("env".to_string(), json!(env));
            }
        }
        local
    };

    target.insert("disabled".to_string(), Value::Bool(false));

    if let Some(tools) = &config.auto_approve_tools {
        let auto_approve = if tools.is_empty() {
            vec!["*".to_string()]
        } else {
            tools.clone()
        };
        target.insert("autoApprove".to_string(), json!(auto_approve));
    }

    Value::Object(target)
}

/// Cline 转换
fn transform_cline(_server_name: &str, config: &McpServerConfig) -> Value {
    if config.is_remote() {
        let mut remote = Map::new();
        if let Some(url) = &config.url {
            remote.insert("url".to_string(), Value::String(url.clone()));
        }
        remote.insert(
            "type".to_string(),
            Value::String(
                if matches!(config.r#type, Some(TransportType::Sse)) {
                    "sse"
                } else {
                    "streamableHttp"
                }
                .to_string(),
            ),
        );
        remote.insert("disabled".to_string(), Value::Bool(false));
        if let Some(headers) = &config.headers {
            if !headers.is_empty() {
                remote.insert("headers".to_string(), json!(headers));
            }
        }
        return Value::Object(remote);
    }

    let mut local = Map::new();
    if let Some(cmd) = &config.command {
        local.insert("command".to_string(), Value::String(cmd.clone()));
    }
    local.insert(
        "args".to_string(),
        json!(config.args.clone().unwrap_or_default()),
    );
    local.insert("disabled".to_string(), Value::Bool(false));
    if let Some(env) = &config.env {
        if !env.is_empty() {
            local.insert("env".to_string(), json!(env));
        }
    }
    Value::Object(local)
}

/// Antigravity / Windsurf 转换
fn transform_antigravity(_server_name: &str, config: &McpServerConfig) -> Value {
    if config.is_remote() {
        let mut remote = Map::new();
        if let Some(url) = &config.url {
            remote.insert("serverUrl".to_string(), Value::String(url.clone()));
        }
        if let Some(headers) = &config.headers {
            if !headers.is_empty() {
                remote.insert("headers".to_string(), json!(headers));
            }
        }
        return Value::Object(remote);
    }

    let mut local = Map::new();
    if let Some(cmd) = &config.command {
        local.insert("command".to_string(), Value::String(cmd.clone()));
    }
    local.insert(
        "args".to_string(),
        json!(config.args.clone().unwrap_or_default()),
    );
    if let Some(env) = &config.env {
        if !env.is_empty() {
            local.insert("env".to_string(), json!(env));
        }
    }
    Value::Object(local)
}

/// GitHub Copilot CLI 转换
fn transform_copilot(_server_name: &str, config: &McpServerConfig, local: bool) -> Value {
    if local {
        // 项目级使用 VS Code mcp.json schema
        return transform_standard(_server_name, config);
    }

    if config.is_remote() {
        let mut remote = Map::new();
        remote.insert(
            "type".to_string(),
            Value::String(
                match config.r#type {
                    Some(TransportType::Sse) => "sse",
                    _ => "http",
                }
                .to_string(),
            ),
        );
        if let Some(url) = &config.url {
            remote.insert("url".to_string(), Value::String(url.clone()));
        }
        remote.insert("tools".to_string(), json!(["*"]));
        if let Some(headers) = &config.headers {
            if !headers.is_empty() {
                remote.insert("headers".to_string(), json!(headers));
            }
        }
        return Value::Object(remote);
    }

    let mut local_cfg = Map::new();
    local_cfg.insert("type".to_string(), Value::String("stdio".to_string()));
    if let Some(cmd) = &config.command {
        local_cfg.insert("command".to_string(), Value::String(cmd.clone()));
    }
    local_cfg.insert(
        "args".to_string(),
        json!(config.args.clone().unwrap_or_default()),
    );
    local_cfg.insert("tools".to_string(), json!(["*"]));
    if let Some(env) = &config.env {
        if !env.is_empty() {
            local_cfg.insert("env".to_string(), json!(env));
        }
    }
    Value::Object(local_cfg)
}

/// 能力门控：移除不支持的 OptionalField
pub fn apply_field_support(
    config: &McpServerConfig,
    supported_fields: &[OptionalField],
) -> (McpServerConfig, Vec<OptionalField>) {
    let mut copy = config.clone();
    let mut dropped = Vec::new();

    if copy.timeout.is_some() && !supported_fields.contains(&OptionalField::Timeout) {
        copy.timeout = None;
        dropped.push(OptionalField::Timeout);
    }

    if copy.oauth_scopes.is_some()
        && !supported_fields.contains(&OptionalField::Scopes)
    {
        copy.oauth_scopes = None;
        dropped.push(OptionalField::Scopes);
    }

    if copy.auto_approve_tools.is_some()
        && !supported_fields.contains(&OptionalField::AutoApprove)
    {
        copy.auto_approve_tools = None;
        dropped.push(OptionalField::AutoApprove);
    }

    (copy, dropped)
}

/// 根据 Agent 类型转换配置
pub fn transform_config(
    agent_type: &AgentType,
    server_name: &str,
    config: &McpServerConfig,
    local: bool,
) -> Value {
    match agent_type {
        AgentType::Antigravity | AgentType::Windsurf => {
            transform_antigravity(server_name, config)
        }
        AgentType::Cline | AgentType::ClineCli => transform_cline(server_name, config),
        AgentType::Catpaw
        | AgentType::ClaudeCode
        | AgentType::ClaudeDesktop
        | AgentType::Qoder
        | AgentType::TraeCn
        | AgentType::TraeInternational
        | AgentType::Vscode
        | AgentType::WorkBuddy
        | AgentType::Mcporter => {
            transform_standard(server_name, config)
        }
        AgentType::Codex => transform_codex(server_name, config),
        AgentType::CodeWhale => transform_codewhale(server_name, config),
        AgentType::Cursor => transform_cursor(server_name, config),
        AgentType::GeminiCli => transform_gemini(server_name, config),
        AgentType::Goose => transform_goose(server_name, config),
        AgentType::KimiCode => transform_kimi_code(server_name, config),
        AgentType::Kiro => transform_kiro(server_name, config),
        AgentType::MiMoCode => transform_mimocode(server_name, config),
        AgentType::Zed => transform_zed(server_name, config),
        AgentType::Opencode => transform_opencode(server_name, config),
        AgentType::GitHubCopilotCli => transform_copilot(server_name, config, local),
        AgentType::DeepseekReasonix => transform_standard(server_name, config),
        AgentType::Zcode => transform_standard(server_name, config),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deepseek_uses_standard_mcp_server_shape() {
        let config = McpServerConfig {
            command: Some("npx".to_string()),
            args: Some(vec!["-y".to_string(), "context7".to_string()]),
            ..Default::default()
        };

        let transformed = transform_config(
            &AgentType::DeepseekReasonix,
            "context7",
            &config,
            false,
        );

        assert_eq!(transformed["command"], "npx");
        assert_eq!(transformed["args"][0], "-y");
        assert!(transformed.get("type").is_none());
    }

    #[test]
    fn qoder_and_catpaw_use_standard_mcp_server_shape() {
        let config = McpServerConfig {
            command: Some("npx".to_string()),
            args: Some(vec!["-y".to_string(), "@upstash/context7-mcp".to_string()]),
            ..Default::default()
        };

        for agent_type in [AgentType::Qoder, AgentType::Catpaw] {
            let transformed = transform_config(&agent_type, "context7", &config, false);
            assert_eq!(transformed["command"], "npx");
            assert_eq!(transformed["args"][1], "@upstash/context7-mcp");
            assert!(transformed.get("type").is_none());
        }
    }

    #[test]
    fn kiro_maps_auto_approve_all_to_star() {
        let config = McpServerConfig {
            command: Some("npx".to_string()),
            args: Some(vec!["-y".to_string(), "@upstash/context7-mcp".to_string()]),
            auto_approve_tools: Some(vec![]),
            ..Default::default()
        };

        let transformed = transform_config(&AgentType::Kiro, "context7", &config, false);

        assert_eq!(transformed["command"], "npx");
        assert_eq!(transformed["disabled"], false);
        assert_eq!(transformed["autoApprove"][0], "*");
        assert!(transformed.get("type").is_none());
    }

    #[test]
    fn kiro_preserves_remote_oauth_scopes() {
        let config = McpServerConfig {
            r#type: Some(TransportType::Http),
            url: Some("https://api.github.com/mcp".to_string()),
            oauth_scopes: Some(vec!["repo".to_string(), "user".to_string()]),
            auto_approve_tools: Some(vec!["list_issues".to_string()]),
            ..Default::default()
        };

        let transformed = transform_config(&AgentType::Kiro, "github", &config, false);

        assert_eq!(transformed["url"], "https://api.github.com/mcp");
        assert_eq!(transformed["oauthScopes"][0], "repo");
        assert_eq!(transformed["autoApprove"][0], "list_issues");
        assert!(transformed.get("type").is_none());
    }

    #[test]
    fn codewhale_uses_servers_shape_without_type_field() {
        let config = McpServerConfig {
            r#type: Some(TransportType::Sse),
            url: Some("https://example.com/sse".to_string()),
            oauth_scopes: Some(vec!["tools/read".to_string()]),
            ..Default::default()
        };

        let transformed = transform_config(&AgentType::CodeWhale, "docs", &config, false);

        assert_eq!(transformed["url"], "https://example.com/sse");
        assert_eq!(transformed["transport"], "sse");
        assert_eq!(transformed["scopes"][0], "tools/read");
        assert_eq!(transformed["disabled"], false);
        assert!(transformed.get("type").is_none());
    }

    #[test]
    fn kimi_code_uses_mcp_servers_shape_with_transport_and_timeout() {
        let config = McpServerConfig {
            r#type: Some(TransportType::Sse),
            url: Some("https://example.com/sse".to_string()),
            headers: Some(
                [("Authorization".to_string(), "Bearer ${TOKEN}".to_string())]
                    .into_iter()
                    .collect(),
            ),
            timeout: Some(45000),
            ..Default::default()
        };

        let transformed = transform_config(&AgentType::KimiCode, "events", &config, false);

        assert_eq!(transformed["url"], "https://example.com/sse");
        assert_eq!(transformed["transport"], "sse");
        assert_eq!(transformed["headers"]["Authorization"], "Bearer ${TOKEN}");
        assert_eq!(transformed["startupTimeoutMs"], 45000);
        assert_eq!(transformed["enabled"], true);
        assert!(transformed.get("type").is_none());
    }

    #[test]
    fn mimocode_uses_opencode_mcp_shape_with_timeout_and_scope() {
        let config = McpServerConfig {
            r#type: Some(TransportType::Http),
            url: Some("https://example.com/mcp".to_string()),
            timeout: Some(8000),
            oauth_scopes: Some(vec!["repo".to_string(), "user".to_string()]),
            ..Default::default()
        };

        let transformed = transform_config(&AgentType::MiMoCode, "github", &config, false);

        assert_eq!(transformed["type"], "remote");
        assert_eq!(transformed["url"], "https://example.com/mcp");
        assert_eq!(transformed["timeout"], 8000);
        assert_eq!(transformed["oauth"]["scope"], "repo user");
        assert_eq!(transformed["enabled"], true);
    }

    #[test]
    fn workbuddy_uses_standard_mcp_servers_shape() {
        let config = McpServerConfig {
            command: Some("uvx".to_string()),
            args: Some(vec!["wecom-bot-mcp-server".to_string()]),
            env: Some(
                [("WECOM_WEBHOOK_URL".to_string(), "https://example.com/hook".to_string())]
                    .into_iter()
                    .collect(),
            ),
            ..Default::default()
        };

        let transformed = transform_config(&AgentType::WorkBuddy, "wecom", &config, false);

        assert_eq!(transformed["command"], "uvx");
        assert_eq!(transformed["args"][0], "wecom-bot-mcp-server");
        assert_eq!(
            transformed["env"]["WECOM_WEBHOOK_URL"],
            "https://example.com/hook"
        );
        assert!(transformed.get("type").is_none());
    }

    #[test]
    fn trae_variants_use_standard_mcp_servers_shape() {
        let config = McpServerConfig {
            r#type: Some(TransportType::Http),
            url: Some("https://api.example.com/mcp".to_string()),
            headers: Some(
                [("Authorization".to_string(), "Bearer ${TOKEN}".to_string())]
                    .into_iter()
                    .collect(),
            ),
            ..Default::default()
        };

        for agent_type in [AgentType::TraeCn, AgentType::TraeInternational] {
            let transformed = transform_config(&agent_type, "docs", &config, false);
            assert_eq!(transformed["url"], "https://api.example.com/mcp");
            assert_eq!(transformed["type"], "http");
            assert_eq!(transformed["headers"]["Authorization"], "Bearer ${TOKEN}");
        }
    }
}
