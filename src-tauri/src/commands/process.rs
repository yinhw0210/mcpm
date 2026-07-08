// 进程管理 Tauri Commands
// 启动/停止/状态/JSON-RPC 交互

use crate::agent::types::McpServerConfig;
use crate::process::{ProcessManager, ServerProbe, ServerStatus};
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;

/// 启动 Server 进程请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartServerRequest {
    pub server_name: String,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
    pub url: Option<String>,
    pub transport: Option<String>,
}

/// 启动一个 stdio 类型的 MCP Server 子进程
#[tauri::command]
pub async fn start_server_process(
    req: StartServerRequest,
    state: State<'_, Arc<ProcessManager>>,
    app_handle: tauri::AppHandle,
) -> Result<u32, String> {
    // 只有 stdio 类型才能启动进程
    let config = McpServerConfig {
        command: req.command,
        args: req.args,
        env: req.env,
        url: req.url,
        r#type: req.transport.as_deref().and_then(|t| match t {
            "http" => Some(crate::agent::types::TransportType::Http),
            "sse" => Some(crate::agent::types::TransportType::Sse),
            _ => None,
        }),
        ..Default::default()
    };

    if config.url.is_some() {
        return Err("Remote (HTTP/SSE) servers cannot be started as local processes. Use the config manager to add them to agent configs.".to_string());
    }

    if config.command.is_none() {
        return Err("No command specified for stdio server".to_string());
    }

    state
        .start_server(req.server_name, &config, app_handle)
        .await
}

/// 停止指定 Server 进程
#[tauri::command]
pub async fn stop_server_process(
    server_name: String,
    state: State<'_, Arc<ProcessManager>>,
) -> Result<(), String> {
    state.stop_server(&server_name).await
}

/// 获取所有运行中 Server 的状态
#[tauri::command]
pub async fn get_server_statuses(
    servers: Option<Vec<ServerProbe>>,
    state: State<'_, Arc<ProcessManager>>,
) -> Result<Vec<ServerStatus>, String> {
    Ok(state.get_statuses(&servers.unwrap_or_default()).await)
}

/// 向指定 Server 的 stdin 发送 JSON-RPC 消息
#[tauri::command]
pub async fn send_jsonrpc(
    server_name: String,
    message: String,
    state: State<'_, Arc<ProcessManager>>,
) -> Result<(), String> {
    state.send_jsonrpc(&server_name, &message).await
}
