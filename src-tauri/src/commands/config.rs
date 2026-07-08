// 配置与环境检测 Tauri Commands

use serde::Serialize;

/// 运行时检测结果
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeInfo {
    pub nodejs: Option<String>,
    pub npx: Option<String>,
    pub python: Option<String>,
    pub bun: Option<String>,
    pub uvx: Option<String>,
}

/// 检测本地运行时环境（Node.js / Python / Bun 等）
#[tauri::command]
pub async fn detect_runtimes() -> Result<RuntimeInfo, String> {
    crate::runtime::ensure_runtime_path_env();

    let nodejs = which::which("node").ok().map(|p| p.to_string_lossy().to_string());
    let npx = which::which("npx").ok().map(|p| p.to_string_lossy().to_string());
    let python = which::which("python3")
        .or_else(|_| which::which("python"))
        .ok()
        .map(|p| p.to_string_lossy().to_string());
    let bun = which::which("bun").ok().map(|p| p.to_string_lossy().to_string());
    let uvx = which::which("uvx").ok().map(|p| p.to_string_lossy().to_string());

    Ok(RuntimeInfo {
        nodejs,
        npx,
        python,
        bun,
        uvx,
    })
}

/// 获取配置文件预览
#[tauri::command]
pub async fn get_config_preview(
    agent_type: String,
    scope: String,
    cwd: Option<String>,
) -> Result<String, String> {
    use crate::agent::definitions::get_agent_config;

    let agent_type = crate::agent::types::AgentType::from_str(&agent_type)
        .ok_or_else(|| format!("Unknown agent: {}", agent_type))?;

    let agent = get_agent_config(&agent_type)
        .ok_or("Agent config not found")?;

    let local = scope == "local";
    let config_path = agent.resolve_config_path(local, cwd.as_deref());
    let config = crate::format::read_config_file(&config_path, agent.format);

    Ok(serde_json::to_string_pretty(&config).unwrap_or_default())
}
