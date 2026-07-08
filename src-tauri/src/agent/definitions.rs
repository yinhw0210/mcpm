// Agent 定义：15+ AI Agent 的完整配置
// 参考: add-mcp/src/agents.ts

use super::types::*;
use dirs::home_dir;

fn home() -> String {
    home_dir()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|| "~".to_string())
}

fn platform_app_support() -> String {
    #[cfg(target_os = "macos")]
    {
        format!("{}/Library/Application Support", home())
    }
    #[cfg(target_os = "windows")]
    {
        std::env::var("APPDATA")
            .unwrap_or_else(|_| format!("{}/AppData/Roaming", home()))
    }
    #[cfg(target_os = "linux")]
    {
        std::env::var("XDG_CONFIG_HOME").unwrap_or_else(|_| format!("{}/.config", home()))
    }
}

fn vscode_user_path() -> String {
    #[cfg(target_os = "macos")]
    {
        format!("{}/Library/Application Support/Code/User", home())
    }
    #[cfg(target_os = "windows")]
    {
        let app_data =
            std::env::var("APPDATA").unwrap_or_else(|_| format!("{}/AppData/Roaming", home()));
        format!("{}/Code/User", app_data)
    }
    #[cfg(target_os = "linux")]
    {
        let config_dir =
            std::env::var("XDG_CONFIG_HOME").unwrap_or_else(|_| format!("{}/.config", home()));
        format!("{}/Code/User", config_dir)
    }
}

fn goose_config_path() -> String {
    #[cfg(target_os = "macos")]
    {
        format!("{}/.config/goose/config.yaml", home())
    }
    #[cfg(target_os = "windows")]
    {
        format!("{}/Block/goose/config/config.yaml", platform_app_support())
    }
    #[cfg(target_os = "linux")]
    {
        format!("{}/goose/config.yaml", platform_app_support())
    }
}

fn zed_config_path() -> String {
    #[cfg(any(target_os = "macos", target_os = "windows"))]
    {
        format!("{}/Zed/settings.json", platform_app_support())
    }
    #[cfg(target_os = "linux")]
    {
        format!("{}/zed/settings.json", platform_app_support())
    }
}

fn mimocode_config_path() -> String {
    if let Ok(home) = std::env::var("MIMOCODE_HOME") {
        if !home.is_empty() {
            return format!("{}/config/mimocode.json", home);
        }
    }
    format!("{}/.config/mimocode/mimocode.json", home())
}

fn kimi_code_mcp_path() -> String {
    if let Ok(home) = std::env::var("KIMI_CODE_HOME") {
        if !home.is_empty() {
            return format!("{}/mcp.json", home);
        }
    }
    format!("{}/.kimi-code/mcp.json", home())
}

/// 获取所有 Agent 配置定义
pub fn get_all_agents() -> Vec<AgentConfig> {
    let h = home();
    let app_support = platform_app_support();
    let vscode_path = vscode_user_path();
    let goose_path = goose_config_path();
    let zed_path = zed_config_path();

    let antigravity_config = format!("{}/.gemini/config/mcp_config.json", h);
    let cline_cli_config = format!(
        "{}/.cline/data/settings/cline_mcp_settings.json",
        std::env::var("CLINE_DIR").unwrap_or_else(|_| h.clone())
    );
    let cline_ext_config = format!(
        "{}/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json",
        vscode_path
    );
    let copilot_config = format!(
        "{}/mcp-config.json",
        std::env::var("XDG_CONFIG_HOME").unwrap_or_else(|_| format!("{}/.copilot", h))
    );
    let windsurf_config = format!("{}/.codeium/windsurf/mcp_config.json", h);
    let codex_home = std::env::var("CODEX_HOME").unwrap_or_else(|_| format!("{}/.codex", h));

    vec![
        AgentConfig {
            agent_type: AgentType::Antigravity,
            display_name: "Antigravity",
            config_path: antigravity_config,
            local_config_path: None,
            project_detect_paths: &[],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::Cline,
            display_name: "Cline VSCode Extension",
            config_path: cline_ext_config,
            local_config_path: None,
            project_detect_paths: &[],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::ClineCli,
            display_name: "Cline CLI",
            config_path: cline_cli_config,
            local_config_path: None,
            project_detect_paths: &[],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::ClaudeCode,
            display_name: "Claude Code",
            config_path: format!("{}/.claude.json", h),
            local_config_path: Some(".mcp.json"),
            project_detect_paths: &[".mcp.json", ".claude"],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[OptionalField::Timeout, OptionalField::AutoApprove],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::ClaudeDesktop,
            display_name: "Claude Desktop",
            config_path: format!("{}/Claude/claude_desktop_config.json", app_support),
            local_config_path: None,
            project_detect_paths: &[],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio"],
            supported_fields: &[],
            unsupported_transport_message: Some(
                "Claude Desktop only supports local (stdio) servers via its config file.",
            ),
        },
        AgentConfig {
            agent_type: AgentType::CodeWhale,
            display_name: "CodeWhale",
            config_path: format!("{}/.codewhale/mcp.json", h),
            local_config_path: None,
            project_detect_paths: &[],
            config_key: "servers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[OptionalField::Scopes],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::Codex,
            display_name: "Codex",
            config_path: format!("{}/config.toml", codex_home),
            local_config_path: Some(".codex/config.toml"),
            project_detect_paths: &[".codex"],
            config_key: "mcp_servers",
            local_config_key: None,
            format: ConfigFormat::Toml,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[OptionalField::AutoApprove],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::Catpaw,
            display_name: "CatPaw",
            config_path: format!(
                "{}/CatPawAI/User/globalStorage/mt-idekit.mt-idekit-code/settings/mcopilot_mcp_settings.json",
                app_support
            ),
            local_config_path: None,
            project_detect_paths: &[],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::Cursor,
            display_name: "Cursor",
            config_path: format!("{}/.cursor/mcp.json", h),
            local_config_path: Some(".cursor/mcp.json"),
            project_detect_paths: &[".cursor"],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[OptionalField::Scopes],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::DeepseekReasonix,
            display_name: "DeepSeek Reasonix",
            config_path: format!("{}/.reasonix/config.json", h),
            local_config_path: Some(".reasonix/settings.json"),
            project_detect_paths: &[".reasonix"],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::GeminiCli,
            display_name: "Gemini CLI",
            config_path: format!("{}/.gemini/settings.json", h),
            local_config_path: Some(".gemini/settings.json"),
            project_detect_paths: &[".gemini"],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[OptionalField::Timeout, OptionalField::Scopes],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::Goose,
            display_name: "Goose",
            config_path: goose_path,
            local_config_path: None,
            project_detect_paths: &[],
            config_key: "extensions",
            local_config_key: None,
            format: ConfigFormat::Yaml,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::GitHubCopilotCli,
            display_name: "GitHub Copilot CLI",
            config_path: copilot_config,
            local_config_path: Some(".vscode/mcp.json"),
            project_detect_paths: &[".vscode"],
            config_key: "mcpServers",
            local_config_key: Some("servers"),
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::Kiro,
            display_name: "Kiro",
            config_path: format!("{}/.kiro/settings/mcp.json", h),
            local_config_path: Some(".kiro/settings/mcp.json"),
            project_detect_paths: &[".kiro"],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[OptionalField::Scopes, OptionalField::AutoApprove],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::KimiCode,
            display_name: "Kimi Code",
            config_path: kimi_code_mcp_path(),
            local_config_path: Some(".kimi-code/mcp.json"),
            project_detect_paths: &[".kimi-code"],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[OptionalField::Timeout],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::Mcporter,
            display_name: "MCPorter",
            config_path: format!("{}/.mcporter/mcporter.json", h),
            local_config_path: Some("config/mcporter.json"),
            project_detect_paths: &["config/mcporter.json"],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::MiMoCode,
            display_name: "MiMoCode",
            config_path: mimocode_config_path(),
            local_config_path: Some(".mimocode/mimocode.json"),
            project_detect_paths: &[".mimocode"],
            config_key: "mcp",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[OptionalField::Timeout, OptionalField::Scopes],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::Opencode,
            display_name: "OpenCode",
            config_path: format!("{}/.config/opencode/opencode.json", h),
            local_config_path: Some("opencode.json"),
            project_detect_paths: &["opencode.json", ".opencode"],
            config_key: "mcp",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::Qoder,
            display_name: "Qoder",
            config_path: format!("{}/.qoder/settings.json", h),
            local_config_path: Some(".qoder/settings.local.json"),
            project_detect_paths: &[".qoder", ".mcp.json"],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::TraeCn,
            display_name: "TRAE CN",
            config_path: format!("{}/Trae CN/User/mcp.json", app_support),
            local_config_path: Some(".trae/mcp.json"),
            project_detect_paths: &[".trae"],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::TraeInternational,
            display_name: "TRAE International",
            config_path: format!("{}/Trae/User/mcp.json", app_support),
            local_config_path: Some(".trae/mcp.json"),
            project_detect_paths: &[".trae"],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::Vscode,
            display_name: "VS Code",
            config_path: format!("{}/mcp.json", vscode_path),
            local_config_path: Some(".vscode/mcp.json"),
            project_detect_paths: &[".vscode"],
            config_key: "servers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::WorkBuddy,
            display_name: "WorkBuddy",
            config_path: format!("{}/.workbuddy/mcp.json", h),
            local_config_path: Some(".workbuddy/mcp.json"),
            project_detect_paths: &[".workbuddy"],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::Windsurf,
            display_name: "Windsurf",
            config_path: windsurf_config,
            local_config_path: None,
            project_detect_paths: &[],
            config_key: "mcpServers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[],
            unsupported_transport_message: None,
        },
        AgentConfig {
            agent_type: AgentType::Zed,
            display_name: "Zed",
            config_path: zed_path,
            local_config_path: Some(".zed/settings.json"),
            project_detect_paths: &[".zed"],
            config_key: "context_servers",
            local_config_key: None,
            format: ConfigFormat::Json,
            supported_transports: &["stdio", "http", "sse"],
            supported_fields: &[],
            unsupported_transport_message: None,
        },
    ]
}

/// 全局缓存所有 Agent 定义
pub fn get_agent_config(agent_type: &AgentType) -> Option<AgentConfig> {
    get_all_agents()
        .into_iter()
        .find(|a| &a.agent_type == agent_type)
}

/// 获取所有 Agent 类型列表
#[allow(dead_code)]
pub fn get_all_agent_types() -> Vec<AgentType> {
    get_all_agents().iter().map(|a| a.agent_type).collect()
}

/// 所有 Agent 定义（惰性获取）
#[allow(dead_code)]
pub fn agents() -> Vec<AgentConfig> {
    get_all_agents()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catpaw_uses_mcopilot_global_storage_settings() {
        let catpaw = get_agent_config(&AgentType::Catpaw).unwrap();

        assert!(catpaw
            .config_path
            .ends_with("CatPawAI/User/globalStorage/mt-idekit.mt-idekit-code/settings/mcopilot_mcp_settings.json"));
        assert!(!catpaw.supports_project_config());
        assert_eq!(catpaw.config_key, "mcpServers");
    }

    #[test]
    fn kiro_uses_official_mcp_config_locations() {
        let kiro = get_agent_config(&AgentType::Kiro).unwrap();

        assert!(kiro.config_path.ends_with(".kiro/settings/mcp.json"));
        assert_eq!(kiro.local_config_path, Some(".kiro/settings/mcp.json"));
        assert_eq!(kiro.config_key, "mcpServers");
        assert!(kiro.supported_fields.contains(&OptionalField::AutoApprove));
        assert!(kiro.supported_fields.contains(&OptionalField::Scopes));
    }

    #[test]
    fn codewhale_uses_official_mcp_config_location() {
        let codewhale = get_agent_config(&AgentType::CodeWhale).unwrap();

        assert!(codewhale.config_path.ends_with(".codewhale/mcp.json"));
        assert!(!codewhale.supports_project_config());
        assert_eq!(codewhale.config_key, "servers");
        assert!(codewhale.supported_fields.contains(&OptionalField::Scopes));
    }

    #[test]
    fn kimi_code_uses_official_mcp_config_locations() {
        let kimi_code = get_agent_config(&AgentType::KimiCode).unwrap();

        assert!(kimi_code.config_path.ends_with(".kimi-code/mcp.json"));
        assert_eq!(kimi_code.local_config_path, Some(".kimi-code/mcp.json"));
        assert_eq!(kimi_code.config_key, "mcpServers");
        assert!(kimi_code.supported_fields.contains(&OptionalField::Timeout));
        assert!(!kimi_code.supported_fields.contains(&OptionalField::Scopes));
    }

    #[test]
    fn mimocode_uses_official_config_locations() {
        let mimocode = get_agent_config(&AgentType::MiMoCode).unwrap();

        assert!(mimocode
            .config_path
            .ends_with(".config/mimocode/mimocode.json"));
        assert_eq!(
            mimocode.local_config_path,
            Some(".mimocode/mimocode.json")
        );
        assert_eq!(mimocode.config_key, "mcp");
        assert!(mimocode.supported_fields.contains(&OptionalField::Timeout));
        assert!(mimocode.supported_fields.contains(&OptionalField::Scopes));
    }

    #[test]
    fn workbuddy_uses_official_mcp_config_locations() {
        let workbuddy = get_agent_config(&AgentType::WorkBuddy).unwrap();

        assert!(workbuddy.config_path.ends_with(".workbuddy/mcp.json"));
        assert_eq!(workbuddy.local_config_path, Some(".workbuddy/mcp.json"));
        assert_eq!(workbuddy.config_key, "mcpServers");
        assert!(workbuddy.supported_fields.is_empty());
    }

    #[test]
    fn trae_variants_use_separate_global_config_and_shared_project_config() {
        let trae_cn = get_agent_config(&AgentType::TraeCn).unwrap();
        let trae_international = get_agent_config(&AgentType::TraeInternational).unwrap();

        assert!(trae_cn.config_path.ends_with("Trae CN/User/mcp.json"));
        assert!(trae_international
            .config_path
            .ends_with("Trae/User/mcp.json"));
        assert_eq!(trae_cn.local_config_path, Some(".trae/mcp.json"));
        assert_eq!(
            trae_international.local_config_path,
            Some(".trae/mcp.json")
        );
        assert_eq!(trae_cn.config_key, "mcpServers");
        assert_eq!(trae_international.config_key, "mcpServers");
        assert!(trae_cn.supported_fields.is_empty());
        assert!(trae_international.supported_fields.is_empty());
    }
}
