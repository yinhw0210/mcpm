// Agent 安装检测
// 参考: add-mcp/src/agents.ts 中的 detectGlobalInstall / detectProjectAgents

use super::definitions::get_all_agents;
use super::types::*;
use std::path::Path;

/// 检测全局安装的 Agent
pub async fn detect_global_agents() -> Vec<AgentType> {
    let agents = get_all_agents();
    let mut detected = Vec::new();

    for agent in &agents {
        if is_agent_globally_installed(agent) {
            detected.push(agent.agent_type);
        }
    }

    detected
}

/// 检测项目级安装的 Agent
pub fn detect_project_agents(cwd: &str) -> Vec<AgentType> {
    let agents = get_all_agents();
    let mut detected = Vec::new();

    for agent in &agents {
        if !agent.supports_project_config() {
            continue;
        }
        for detect_path in agent.project_detect_paths {
            let full_path = format!("{}/{}", cwd, detect_path);
            if Path::new(&full_path).exists() {
                detected.push(agent.agent_type);
                break;
            }
        }
    }

    detected
}

fn is_agent_globally_installed(agent: &AgentConfig) -> bool {
    match agent.agent_type {
        AgentType::Antigravity => Path::new(&format!("{}/.gemini/config", home_dir_str())).exists(),
        AgentType::Cline => {
            let path = &agent.config_path;
            Path::new(path)
                .parent()
                .map(|p| p.exists())
                .unwrap_or(false)
        }
        AgentType::ClineCli => {
            let path = &agent.config_path;
            Path::new(path)
                .parent()
                .map(|p| p.exists())
                .unwrap_or(false)
        }
        AgentType::ClaudeCode => Path::new(&format!("{}/.claude", home_dir_str())).exists(),
        AgentType::ClaudeDesktop => {
            Path::new(&format!("{}/Claude", platform_app_support())).exists()
        }
        AgentType::CodeWhale => Path::new(&format!("{}/.codewhale", home_dir_str())).exists()
            || Path::new(&format!("{}/.deepseek", home_dir_str())).exists(),
        AgentType::Codex => Path::new(&format!("{}/.codex", home_dir_str())).exists(),
        AgentType::Catpaw => Path::new(&format!("{}/CatPawAI", platform_app_support())).exists()
            || Path::new(&agent.config_path).exists(),
        AgentType::Cursor => Path::new(&format!("{}/.cursor", home_dir_str())).exists(),
        AgentType::GeminiCli => Path::new(&format!("{}/.gemini", home_dir_str())).exists(),
        AgentType::Goose => Path::new(&agent.config_path).exists(),
        AgentType::GitHubCopilotCli => {
            Path::new(&format!("{}/.copilot", home_dir_str())).exists()
        }
        AgentType::KimiCode => {
            std::env::var("KIMI_CODE_HOME")
                .ok()
                .filter(|home| !home.is_empty())
                .map(|home| Path::new(&home).exists())
                .unwrap_or(false)
                || Path::new(&format!("{}/.kimi-code", home_dir_str())).exists()
        }
        AgentType::Kiro => Path::new(&format!("{}/.kiro", home_dir_str())).exists(),
        AgentType::Mcporter => Path::new(&format!("{}/.mcporter", home_dir_str())).exists(),
        AgentType::MiMoCode => {
            std::env::var("MIMOCODE_HOME")
                .ok()
                .filter(|home| !home.is_empty())
                .map(|home| Path::new(&home).exists())
                .unwrap_or(false)
                || Path::new(&format!("{}/.config/mimocode", home_dir_str())).exists()
        }
        AgentType::Opencode => Path::new(&format!("{}/.config/opencode", home_dir_str())).exists(),
        AgentType::Qoder => Path::new(&format!("{}/.qoder", home_dir_str())).exists(),
        AgentType::TraeCn => Path::new(&format!("{}/Trae CN", platform_app_support())).exists()
            || Path::new(&agent.config_path).exists(),
        AgentType::TraeInternational => {
            Path::new(&format!("{}/Trae", platform_app_support())).exists()
                || Path::new(&agent.config_path).exists()
        }
        AgentType::Vscode => Path::new(&vscode_user_path()).exists(),
        AgentType::WorkBuddy => Path::new(&format!("{}/.workbuddy", home_dir_str())).exists()
            || Path::new(&format!("{}/WorkBuddy", platform_app_support())).exists(),
        AgentType::Windsurf => {
            Path::new(&format!("{}/.codeium/windsurf", home_dir_str())).exists()
        }
        AgentType::Zed => {
            #[cfg(any(target_os = "macos", target_os = "windows"))]
            {
                Path::new(&format!("{}/Zed", platform_app_support())).exists()
            }
            #[cfg(target_os = "linux")]
            {
                Path::new(&format!("{}/zed", platform_app_support())).exists()
            }
        }
        AgentType::DeepseekReasonix => Path::new(&format!("{}/.reasonix", home_dir_str())).exists(),
    }
}

fn home_dir_str() -> String {
    dirs::home_dir()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_default()
}

fn platform_app_support() -> String {
    #[cfg(target_os = "macos")]
    {
        format!("{}/Library/Application Support", home_dir_str())
    }
    #[cfg(target_os = "windows")]
    {
        std::env::var("APPDATA").unwrap_or_else(|_| format!("{}/AppData/Roaming", home_dir_str()))
    }
    #[cfg(target_os = "linux")]
    {
        std::env::var("XDG_CONFIG_HOME").unwrap_or_else(|_| format!("{}/.config", home_dir_str()))
    }
}

fn vscode_user_path() -> String {
    #[cfg(target_os = "macos")]
    {
        format!(
            "{}/Library/Application Support/Code/User",
            home_dir_str()
        )
    }
    #[cfg(target_os = "windows")]
    {
        let app_data = std::env::var("APPDATA")
            .unwrap_or_else(|_| format!("{}/AppData/Roaming", home_dir_str()));
        format!("{}/Code/User", app_data)
    }
    #[cfg(target_os = "linux")]
    {
        let config_dir = std::env::var("XDG_CONFIG_HOME")
            .unwrap_or_else(|_| format!("{}/.config", home_dir_str()));
        format!("{}/Code/User", config_dir)
    }
}
