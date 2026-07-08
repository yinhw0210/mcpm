// MCP Server 配置管理 Tauri Commands
// 添加/删除/同步 MCP Server 到各 Agent 配置文件

use crate::agent::definitions::{get_agent_config, get_all_agents};
use crate::agent::transform::{apply_field_support, transform_config};
use crate::agent::types::*;
use crate::format;
use crate::source::{build_server_config, parse_source};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

/// 添加 Server 请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddServerRequest {
    pub target: String,
    pub server_name: Option<String>,
    pub agents: Vec<String>,
    pub scope: String, // "local" | "global"
    pub cwd: Option<String>,
    // 远程 Server 选项
    pub transport: Option<String>, // "http" | "sse"
    pub headers: Option<HashMap<String, String>>,
    pub timeout: Option<u32>,
    pub oauth_scopes: Option<Vec<String>>,
    // stdio Server 选项
    pub env: Option<HashMap<String, String>>,
    pub args: Option<Vec<String>>,
    // 高级
    pub auto_approve_tools: Option<Vec<String>>,
}

/// 添加 Server 结果
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AddServerResult {
    pub success: bool,
    pub agent_type: String,
    pub config_path: String,
    pub error: Option<String>,
    pub dropped_fields: Vec<String>,
}

/// 批量添加 MCP Server 到多个 Agent
#[tauri::command]
pub async fn add_mcp_server(req: AddServerRequest) -> Result<Vec<AddServerResult>, String> {
    // 1. 解析源
    let parsed = parse_source(&req.target);

    // 2. 构建统一的 McpServerConfig
    let transport = req.transport.as_deref().and_then(|t| match t {
        "http" => Some(TransportType::Http),
        "sse" => Some(TransportType::Sse),
        _ => None,
    });

    let server_config = build_server_config(
        &parsed,
        transport,
        &req.headers.unwrap_or_default(),
        &req.env.unwrap_or_default(),
        &req.args.unwrap_or_default(),
        req.timeout,
        &req.oauth_scopes.unwrap_or_default(),
        req.auto_approve_tools.as_deref(),
    );

    // 3. 确定 Server 名称
    let name = req
        .server_name
        .unwrap_or_else(|| parsed.inferred_name.clone());

    // 4. 逐个 Agent 安装
    let local = req.scope == "local";
    let mut results = Vec::new();

    for agent_type_str in &req.agents {
        let agent_type = match AgentType::from_str(agent_type_str) {
            Some(t) => t,
            None => {
                results.push(AddServerResult {
                    success: false,
                    agent_type: agent_type_str.clone(),
                    config_path: String::new(),
                    error: Some(format!("Unknown agent: {}", agent_type_str)),
                    dropped_fields: vec![],
                });
                continue;
            }
        };

        let agent_config = match get_agent_config(&agent_type) {
            Some(c) => c,
            None => {
                results.push(AddServerResult {
                    success: false,
                    agent_type: agent_type_str.clone(),
                    config_path: String::new(),
                    error: Some("Agent config not found".to_string()),
                    dropped_fields: vec![],
                });
                continue;
            }
        };

        if let Some(error) = validate_transport_support(&agent_config, &server_config) {
            results.push(AddServerResult {
                success: false,
                agent_type: agent_type_str.clone(),
                config_path: agent_config.resolve_config_path(local, req.cwd.as_deref()),
                error: Some(error),
                dropped_fields: vec![],
            });
            continue;
        }

        // 5. 能力门控：移除不支持的 OptionalField
        let (gated_config, dropped) =
            apply_field_support(&server_config, agent_config.supported_fields);

        // 6. 转换为 Agent 原生 schema
        let transformed = transform_config(&agent_type, &name, &gated_config, local);

        // 7. 写入配置文件
        let config_path = agent_config.resolve_config_path(local, req.cwd.as_deref());
        let config_key = agent_config.resolve_config_key(local);

        match format::write_config_file(
            &config_path,
            agent_config.format,
            config_key,
            &name,
            &transformed,
        ) {
            Ok(()) => {
                let dropped_names: Vec<String> = dropped
                    .iter()
                    .map(|f| match f {
                        OptionalField::Timeout => "timeout".to_string(),
                        OptionalField::Scopes => "scopes".to_string(),
                        OptionalField::AutoApprove => "autoApprove".to_string(),
                    })
                    .collect();

                results.push(AddServerResult {
                    success: true,
                    agent_type: agent_type_str.clone(),
                    config_path,
                    error: None,
                    dropped_fields: dropped_names,
                });
            }
            Err(e) => {
                results.push(AddServerResult {
                    success: false,
                    agent_type: agent_type_str.clone(),
                    config_path,
                    error: Some(e),
                    dropped_fields: vec![],
                });
            }
        }
    }

    Ok(results)
}

/// 删除 Server 请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveServerRequest {
    pub server_name: String,
    pub agents: Vec<String>,
    pub scope: String,
    pub cwd: Option<String>,
}

/// 删除 Server 结果
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveResult {
    pub agent_type: String,
    pub success: bool,
    pub removed: bool,
    pub error: Option<String>,
}

/// 批量删除 MCP Server
#[tauri::command]
pub async fn remove_mcp_server(req: RemoveServerRequest) -> Result<Vec<RemoveResult>, String> {
    let local = req.scope == "local";
    let mut results = Vec::new();

    for agent_type_str in &req.agents {
        let agent_type = match AgentType::from_str(agent_type_str) {
            Some(t) => t,
            None => {
                results.push(RemoveResult {
                    agent_type: agent_type_str.clone(),
                    success: false,
                    removed: false,
                    error: Some(format!("Unknown agent: {}", agent_type_str)),
                });
                continue;
            }
        };

        let agent_config = match get_agent_config(&agent_type) {
            Some(c) => c,
            None => {
                results.push(RemoveResult {
                    agent_type: agent_type_str.clone(),
                    success: false,
                    removed: false,
                    error: Some("Agent config not found".to_string()),
                });
                continue;
            }
        };

        let config_path = agent_config.resolve_config_path(local, req.cwd.as_deref());
        let config_key = agent_config.resolve_config_key(local);

        match format::remove_server_from_config(
            &config_path,
            agent_config.format,
            config_key,
            &req.server_name,
        ) {
            Ok(removed) => {
                results.push(RemoveResult {
                    agent_type: agent_type_str.clone(),
                    success: true,
                    removed,
                    error: None,
                });
            }
            Err(e) => {
                results.push(RemoveResult {
                    agent_type: agent_type_str.clone(),
                    success: false,
                    removed: false,
                    error: Some(e),
                });
            }
        }
    }

    Ok(results)
}

/// 同步结果
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
    pub success: bool,
    pub message: String,
    pub renames: Vec<SyncChange>,
    pub additions: Vec<SyncChange>,
    pub skipped: Vec<SyncSkip>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncChange {
    pub agent_type: String,
    pub server_name: String,
    pub old_name: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncSkip {
    pub identity: String,
    pub reason: String,
}

/// 跨 Agent 同步 MCP Server 配置
/// 参考: add-mcp/src/index.ts 中的 runSyncCommand
#[tauri::command]
pub async fn sync_servers(
    scope: String,
    cwd: Option<String>,
) -> Result<SyncResult, String> {
    let local = scope == "local";
    let agents = get_all_agents();
    sync_agent_configs(&agents, local, cwd.as_deref())
}

fn validate_transport_support(agent: &AgentConfig, config: &McpServerConfig) -> Option<String> {
    let transport = if config.url.is_some() {
        match config.r#type {
            Some(TransportType::Sse) => "sse",
            _ => "http",
        }
    } else {
        "stdio"
    };

    if agent.supported_transports.contains(&transport) {
        return None;
    }

    let hint = agent
        .unsupported_transport_message
        .map(|message| format!(" {}", message))
        .unwrap_or_default();
    Some(format!(
        "{} does not support {} MCP servers.{}",
        agent.display_name, transport, hint
    ))
}

fn sync_agent_configs(
    agents: &[AgentConfig],
    local: bool,
    cwd: Option<&str>,
) -> Result<SyncResult, String> {
    let mut all_servers: Vec<(AgentConfig, Vec<InstalledServer>)> = Vec::new();
    let mut detected_agents: Vec<AgentConfig> = Vec::new();

    // 收集所有 Agent 的已安装 Server
    for agent in agents {
        let detected = if local {
            crate::agent::detect::detect_project_agents(cwd.unwrap_or("."))
                .contains(&agent.agent_type)
        } else {
            std::path::Path::new(&agent.config_path).exists()
        };

        if !detected {
            continue;
        }

        detected_agents.push(agent.clone());

        match super::agent::read_servers_for_agent(agent, local, cwd) {
            Ok(servers) => {
                if !servers.is_empty() {
                    all_servers.push((agent.clone(), servers));
                }
            }
            Err(_) => {}
        }
    }

    if detected_agents.len() < 2 || all_servers.is_empty() {
        return Ok(SyncResult {
            success: true,
            message: "Need at least 2 detected agents and at least 1 server to sync".to_string(),
            renames: vec![],
            additions: vec![],
            skipped: vec![],
        });
    }

    // 按 identity 分组
    let mut groups: HashMap<String, Vec<(AgentConfig, InstalledServer)>> = HashMap::new();
    for (agent, servers) in &all_servers {
        for server in servers {
            if !server.identity.is_empty() {
                groups
                    .entry(server.identity.clone())
                    .or_default()
                    .push((agent.clone(), server.clone()));
            }
        }
    }

    let mut renames = Vec::new();
    let mut additions = Vec::new();
    let mut skipped = Vec::new();

    for (identity, entries) in &groups {
        // 选择最短名称作为规范名称
        let Some((canonical_agent, canonical_server)) = entries
            .iter()
            .min_by_key(|(_, s)| s.server_name.len())
        else {
            continue;
        };
        let canonical_name = canonical_server.server_name.clone();
        let canonical_config = build_server_config_from_stored(&canonical_server.config);

        let present_agents: Vec<AgentType> = entries.iter().map(|(a, _)| a.agent_type).collect();

        // 找出需要重命名的
        for (agent, server) in entries {
            if server.server_name != canonical_name {
                let config_path = agent.resolve_config_path(local, cwd);
                let config_key = agent.resolve_config_key(local);
                let (gated, _) = apply_field_support(&canonical_config, agent.supported_fields);
                if let Some(error) = validate_transport_support(agent, &gated) {
                    skipped.push(SyncSkip {
                        identity: identity.clone(),
                        reason: error,
                    });
                    continue;
                }
                let transformed = transform_config(&agent.agent_type, &canonical_name, &gated, local);
                format::write_config_file(
                    &config_path,
                    agent.format,
                    config_key,
                    &canonical_name,
                    &transformed,
                )?;
                format::remove_server_from_config(
                    &config_path,
                    agent.format,
                    config_key,
                    &server.server_name,
                )?;
                renames.push(SyncChange {
                    agent_type: agent.agent_type.as_str().to_string(),
                    server_name: canonical_name.clone(),
                    old_name: Some(server.server_name.clone()),
                });
            }
        }

        // 找出缺失的 Agent
        for agent in &detected_agents {
            if !present_agents.contains(&agent.agent_type) {
                let (gated, _) = apply_field_support(&canonical_config, agent.supported_fields);
                if let Some(error) = validate_transport_support(agent, &gated) {
                    skipped.push(SyncSkip {
                        identity: identity.clone(),
                        reason: error,
                    });
                    continue;
                }
                let transformed = transform_config(&agent.agent_type, &canonical_name, &gated, local);
                let config_path = agent.resolve_config_path(local, cwd);
                let config_key = agent.resolve_config_key(local);
                format::write_config_file(
                    &config_path,
                    agent.format,
                    config_key,
                    &canonical_name,
                    &transformed,
                )?;
                additions.push(SyncChange {
                    agent_type: agent.agent_type.as_str().to_string(),
                    server_name: canonical_name.clone(),
                    old_name: None,
                });
            }
        }

        let _ = canonical_agent;
    }

    Ok(SyncResult {
        success: true,
        message: format!(
            "Synced: {} rename(s), {} addition(s), {} skipped",
            renames.len(),
            additions.len(),
            skipped.len()
        ),
        renames,
        additions,
        skipped,
    })
}

fn normalize_transport_type(raw: Option<&Value>) -> TransportType {
    match raw.and_then(|v| v.as_str()) {
        Some("sse") => TransportType::Sse,
        _ => TransportType::Http,
    }
}

fn string_array(value: Option<&Value>) -> Vec<String> {
    value
        .and_then(|v| v.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(ToString::to_string))
                .collect()
        })
        .unwrap_or_default()
}

fn string_map(value: Option<&Value>) -> Option<HashMap<String, String>> {
    let map = value?.as_object()?;
    let result: HashMap<String, String> = map
        .iter()
        .filter_map(|(key, value)| value.as_str().map(|v| (key.clone(), v.to_string())))
        .collect();
    if result.is_empty() {
        None
    } else {
        Some(result)
    }
}

fn build_server_config_from_stored(config: &Value) -> McpServerConfig {
    let url = config
        .get("url")
        .and_then(|v| v.as_str())
        .or_else(|| config.get("uri").and_then(|v| v.as_str()))
        .or_else(|| config.get("serverUrl").and_then(|v| v.as_str()));

    if let Some(url) = url {
        return McpServerConfig {
            r#type: Some(normalize_transport_type(config.get("type"))),
            url: Some(url.to_string()),
            headers: string_map(config.get("headers")).or_else(|| string_map(config.get("http_headers"))),
            ..Default::default()
        };
    }

    let command = config
        .get("command")
        .and_then(|v| v.as_str())
        .or_else(|| config.get("cmd").and_then(|v| v.as_str()))
        .map(ToString::to_string);

    McpServerConfig {
        command,
        args: Some(string_array(config.get("args"))),
        env: string_map(config.get("env"))
            .or_else(|| string_map(config.get("envs")))
            .or_else(|| string_map(config.get("environment"))),
        ..Default::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::agent::definitions::get_agent_config;
    use crate::agent::types::{AgentType, TransportType};
    use serde_json::json;
    use std::fs;

    #[test]
    fn rejects_remote_server_for_stdio_only_agent() {
        let agent = get_agent_config(&AgentType::ClaudeDesktop).unwrap();
        let config = McpServerConfig {
            r#type: Some(TransportType::Http),
            url: Some("https://mcp.context7.com/mcp".to_string()),
            ..Default::default()
        };

        let error = validate_transport_support(&agent, &config).unwrap();

        assert!(error.contains("Claude Desktop"));
        assert!(error.contains("http"));
    }

    #[test]
    fn sync_plan_writes_missing_agent_config() {
        let temp = std::env::temp_dir().join(format!(
            "mcpm-sync-test-{}",
            uuid::Uuid::new_v4()
        ));
        fs::create_dir_all(&temp).unwrap();

        let cursor_path = temp.join("cursor.json");
        let codex_path = temp.join("codex.json");
        fs::write(
            &cursor_path,
            serde_json::to_string_pretty(&json!({
                "mcpServers": {
                    "context7": {
                        "url": "https://mcp.context7.com/mcp"
                    }
                }
            }))
            .unwrap(),
        )
        .unwrap();
        fs::write(&codex_path, "{}").unwrap();

        let cursor_agent = AgentConfig {
            agent_type: AgentType::Cursor,
            display_name: "Cursor",
            config_path: cursor_path.to_string_lossy().to_string(),
            local_config_path: None,
            project_detect_paths: &[],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[OptionalField::Scopes],
            unsupported_transport_message: None,
        };
        let codex_agent = AgentConfig {
            agent_type: AgentType::Codex,
            display_name: "Codex",
            config_path: codex_path.to_string_lossy().to_string(),
            local_config_path: None,
            project_detect_paths: &[],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[OptionalField::AutoApprove],
            unsupported_transport_message: None,
        };

        let outcome = sync_agent_configs(&[cursor_agent, codex_agent], false, None).unwrap();

        assert_eq!(outcome.additions.len(), 1);
        let codex_config = format::read_config_file(codex_path.to_str().unwrap(), ConfigFormat::Json);
        assert_eq!(
            codex_config["mcpServers"]["context7"]["url"],
            "https://mcp.context7.com/mcp"
        );
    }
}
