// Agent 类型定义
// 参考: add-mcp/src/types.ts

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 所有支持的 Agent 类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AgentType {
    Antigravity,
    Cline,
    #[serde(rename = "cline-cli")]
    ClineCli,
    #[serde(rename = "claude-code")]
    ClaudeCode,
    #[serde(rename = "claude-desktop")]
    ClaudeDesktop,
    #[serde(rename = "codewhale")]
    CodeWhale,
    Codex,
    Catpaw,
    Cursor,
    #[serde(rename = "gemini-cli")]
    GeminiCli,
    Goose,
    #[serde(rename = "github-copilot-cli")]
    GitHubCopilotCli,
    #[serde(rename = "kimi-code")]
    KimiCode,
    Kiro,
    Mcporter,
    #[serde(rename = "mimocode")]
    MiMoCode,
    Opencode,
    Qoder,
    #[serde(rename = "deepseek-reasonix")]
    DeepseekReasonix,
    #[serde(rename = "trae-cn")]
    TraeCn,
    #[serde(rename = "trae-international")]
    TraeInternational,
    Vscode,
    #[serde(rename = "workbuddy")]
    WorkBuddy,
    Windsurf,
    Zed,
}

impl AgentType {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "antigravity" => Some(Self::Antigravity),
            "cline" => Some(Self::Cline),
            "cline-cli" => Some(Self::ClineCli),
            "claude-code" => Some(Self::ClaudeCode),
            "claude-desktop" => Some(Self::ClaudeDesktop),
            "codewhale" => Some(Self::CodeWhale),
            "codex" => Some(Self::Codex),
            "catpaw" => Some(Self::Catpaw),
            "cursor" => Some(Self::Cursor),
            "gemini-cli" => Some(Self::GeminiCli),
            "goose" => Some(Self::Goose),
            "github-copilot-cli" => Some(Self::GitHubCopilotCli),
            "kimi-code" => Some(Self::KimiCode),
            "kiro" => Some(Self::Kiro),
            "mcporter" => Some(Self::Mcporter),
            "mimocode" => Some(Self::MiMoCode),
            "opencode" => Some(Self::Opencode),
            "qoder" => Some(Self::Qoder),
            "deepseek-reasonix" => Some(Self::DeepseekReasonix),
            "trae-cn" => Some(Self::TraeCn),
            "trae-international" => Some(Self::TraeInternational),
            "vscode" => Some(Self::Vscode),
            "workbuddy" => Some(Self::WorkBuddy),
            "windsurf" => Some(Self::Windsurf),
            "zed" => Some(Self::Zed),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Antigravity => "antigravity",
            Self::Cline => "cline",
            Self::ClineCli => "cline-cli",
            Self::ClaudeCode => "claude-code",
            Self::ClaudeDesktop => "claude-desktop",
            Self::CodeWhale => "codewhale",
            Self::Codex => "codex",
            Self::Catpaw => "catpaw",
            Self::Cursor => "cursor",
            Self::GeminiCli => "gemini-cli",
            Self::Goose => "goose",
            Self::GitHubCopilotCli => "github-copilot-cli",
            Self::KimiCode => "kimi-code",
            Self::Kiro => "kiro",
            Self::Mcporter => "mcporter",
            Self::MiMoCode => "mimocode",
            Self::Opencode => "opencode",
            Self::Qoder => "qoder",
            Self::DeepseekReasonix => "deepseek-reasonix",
            Self::TraeCn => "trae-cn",
            Self::TraeInternational => "trae-international",
            Self::Vscode => "vscode",
            Self::WorkBuddy => "workbuddy",
            Self::Windsurf => "windsurf",
            Self::Zed => "zed",
        }
    }
}

/// Agent 别名映射
#[allow(dead_code)]
pub fn resolve_alias(input: &str) -> Option<AgentType> {
    let lower = input.to_lowercase();
    match lower.as_str() {
        "cline-vscode" => Some(AgentType::Cline),
        "deepseek-tui" => Some(AgentType::CodeWhale),
        "codeium" | "cascade" => Some(AgentType::Windsurf),
        "gemini" => Some(AgentType::GeminiCli),
        "github-copilot" => Some(AgentType::Vscode),
        "kimi" | "kimicode" => Some(AgentType::KimiCode),
        "mimo" | "mimo-code" => Some(AgentType::MiMoCode),
        "trae" | "trea" | "trae-ai" | "trae-global" | "trae-intl" => {
            Some(AgentType::TraeInternational)
        }
        "trae-china" | "trae-cn" | "trea-cn" | "trae-cn-ide" => Some(AgentType::TraeCn),
        "work-buddy" | "tencent-workbuddy" => Some(AgentType::WorkBuddy),
        _ => AgentType::from_str(&lower),
    }
}

/// 配置文件格式
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConfigFormat {
    Json,
    Yaml,
    Toml,
}

impl ConfigFormat {
    #[allow(dead_code)]
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Json => "json",
            Self::Yaml => "yaml",
            Self::Toml => "toml",
        }
    }
}

/// 可选字段（能力门控）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OptionalField {
    Timeout,
    Scopes,
    AutoApprove,
}

/// 传输类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TransportType {
    Http,
    Sse,
}

/// 统一的 MCP Server 配置（与前端对齐）
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpServerConfig {
    /// 远程 Server 传输类型
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<TransportType>,
    /// 远程 Server URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    /// 远程 Server HTTP 头
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<HashMap<String, String>>,
    /// stdio Server 命令
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,
    /// stdio Server 参数
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<Vec<String>>,
    /// stdio Server 环境变量
    #[serde(skip_serializing_if = "Option::is_none")]
    pub env: Option<HashMap<String, String>>,
    /// 请求超时 (ms)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout: Option<u32>,
    /// OAuth scopes
    #[serde(skip_serializing_if = "Option::is_none")]
    pub oauth_scopes: Option<Vec<String>>,
    /// 自动审批的工具列表（空数组 = 全部）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_approve_tools: Option<Vec<String>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_trae_aliases_to_the_right_variant() {
        assert_eq!(resolve_alias("trae"), Some(AgentType::TraeInternational));
        assert_eq!(resolve_alias("trea"), Some(AgentType::TraeInternational));
        assert_eq!(resolve_alias("trae-cn"), Some(AgentType::TraeCn));
        assert_eq!(resolve_alias("trea-cn"), Some(AgentType::TraeCn));
    }
}

impl McpServerConfig {
    /// 是否为远程 Server
    pub fn is_remote(&self) -> bool {
        self.url.is_some()
    }
}

/// Agent 配置定义
#[derive(Debug, Clone)]
pub struct AgentConfig {
    pub agent_type: AgentType,
    pub display_name: &'static str,
    /// 全局配置文件路径
    pub config_path: String,
    /// 项目级配置文件路径（相对路径）
    pub local_config_path: Option<&'static str>,
    /// 项目级检测路径（相对路径）
    pub project_detect_paths: &'static [&'static str],
    /// 配置文件中 MCP Server 的键名（支持点号分隔）
    pub config_key: &'static str,
    /// 项目级配置的键名（如果与全局不同）
    pub local_config_key: Option<&'static str>,
    /// 配置文件格式
    pub format: ConfigFormat,
    /// 支持的传输类型
    pub supported_transports: &'static [&'static str],
    /// 支持的可选字段
    pub supported_fields: &'static [OptionalField],
    /// 不支持的传输类型提示
    #[allow(dead_code)]
    pub unsupported_transport_message: Option<&'static str>,
}

impl AgentConfig {
    /// 是否支持项目级配置
    pub fn supports_project_config(&self) -> bool {
        self.local_config_path.is_some()
    }

    /// 是否支持指定传输类型
    #[allow(dead_code)]
    pub fn supports_transport(&self, transport: &str) -> bool {
        self.supported_transports.contains(&transport)
    }

    /// 获取安装范围对应的配置文件路径
    pub fn resolve_config_path(&self, local: bool, cwd: Option<&str>) -> String {
        if local {
            if let Some(local_path) = self.local_config_path {
                let cwd = cwd.unwrap_or(".");
                return format!("{}/{}", cwd, local_path);
            }
        }
        self.config_path.clone()
    }

    /// 获取安装范围对应的配置键名
    pub fn resolve_config_key(&self, local: bool) -> &'static str {
        if local {
            self.local_config_key.unwrap_or(self.config_key)
        } else {
            self.config_key
        }
    }
}

/// 已安装的 Server 信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledServer {
    pub server_name: String,
    pub config: serde_json::Value,
    pub identity: String,
    pub agent_type: String,
    pub scope: String,
    pub config_path: String,
}

/// Agent 及其已配置的 Server 列表
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentWithServers {
    pub agent_type: String,
    pub display_name: String,
    pub detected: bool,
    pub config_path: String,
    pub local_config_path: Option<String>,
    pub supports_project: bool,
    pub global_servers: Vec<InstalledServer>,
    pub local_servers: Vec<InstalledServer>,
}

/// 安装选项
#[derive(Debug, Clone, Default)]
#[allow(dead_code)]
pub struct InstallOptions {
    pub local: bool,
    pub cwd: Option<String>,
}
