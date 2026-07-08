// Agent 相关 Tauri Commands
// 前端通过 invoke 调用这些函数

use crate::agent::definitions::get_all_agents;
use crate::agent::detect::{detect_global_agents, detect_project_agents};
use crate::agent::types::*;
use crate::format;
use crate::format::utils::extract_server_identity;
use serde::{Deserialize, Serialize};

/// Agent 信息（精简版，用于列表展示）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentInfo {
    pub agent_type: String,
    pub display_name: String,
    pub supports_project: bool,
    pub supported_transports: Vec<String>,
    pub config_path: String,
    pub local_config_path: Option<String>,
}

/// 获取所有支持的 Agent 列表
#[tauri::command]
pub async fn list_all_agents() -> Result<Vec<AgentInfo>, String> {
    let agents = get_all_agents();
    let result: Vec<AgentInfo> = agents
        .iter()
        .map(|a| AgentInfo {
            agent_type: a.agent_type.as_str().to_string(),
            display_name: a.display_name.to_string(),
            supports_project: a.supports_project_config(),
            supported_transports: a.supported_transports.iter().map(|s| s.to_string()).collect(),
            config_path: a.config_path.clone(),
            local_config_path: a.local_config_path.map(|s| s.to_string()),
        })
        .collect();
    Ok(result)
}

/// 获取所有 Agent 及其已配置的 MCP Server 列表
#[tauri::command]
pub async fn get_agents_with_servers(
    scope: Option<String>, // "local" | "global"，None = 两者都查
    cwd: Option<String>,
) -> Result<Vec<AgentWithServers>, String> {
    let agents = get_all_agents();
    let detected_global = detect_global_agents().await;
    let detected_project = cwd
        .as_ref()
        .map(|c| detect_project_agents(c))
        .unwrap_or_default();

    let want_global = scope.as_deref() != Some("local");
    let want_local = scope.as_deref() != Some("global");

    let mut results = Vec::new();

    for agent in &agents {
        let is_global_detected = detected_global.contains(&agent.agent_type);
        let is_project_detected = detected_project.contains(&agent.agent_type);
        let detected = is_global_detected || is_project_detected;

        let global_servers = if want_global && is_global_detected {
            read_servers_for_agent(agent, false, None)?
        } else {
            Vec::new()
        };

        let local_servers = if want_local && is_project_detected {
            read_servers_for_agent(agent, true, cwd.as_deref())?
        } else {
            Vec::new()
        };

        results.push(AgentWithServers {
            agent_type: agent.agent_type.as_str().to_string(),
            display_name: agent.display_name.to_string(),
            detected,
            config_path: agent.config_path.clone(),
            local_config_path: agent.local_config_path.map(|s| s.to_string()),
            supports_project: agent.supports_project_config(),
            global_servers,
            local_servers,
        });
    }

    Ok(results)
}

/// 读取指定 Agent 配置文件中的所有 Server
pub fn read_servers_for_agent(
    agent: &AgentConfig,
    local: bool,
    cwd: Option<&str>,
) -> Result<Vec<InstalledServer>, String> {
    let config_path = agent.resolve_config_path(local, cwd);
    let config_key = agent.resolve_config_key(local);

    let full_config = format::read_config_file(&config_path, agent.format);
    let servers_obj = format::get_nested_value(&full_config, config_key);

    let mut servers = Vec::new();

    if let Some(obj) = servers_obj {
        if let Some(map) = obj.as_object() {
            for (server_name, server_config) in map {
                if server_config.is_object() {
                    let config_clone = server_config.clone();
                    let identity = extract_server_identity(&config_clone);
                    servers.push(InstalledServer {
                        server_name: server_name.clone(),
                        config: config_clone,
                        identity,
                        agent_type: agent.agent_type.as_str().to_string(),
                        scope: if local { "local".to_string() } else { "global".to_string() },
                        config_path: config_path.clone(),
                    });
                }
            }
        }
    }

    Ok(servers)
}
