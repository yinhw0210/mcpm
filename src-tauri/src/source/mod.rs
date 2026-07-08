// 源解析模块：解析用户输入的 MCP Server 源（URL / 包名 / 命令行）
// 参考: add-mcp/src/source-parser.ts

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SourceType {
    Remote,
    Package,
    Command,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedSource {
    #[serde(rename = "type")]
    pub source_type: SourceType,
    /// 远程: URL; 包名: 包名; 命令: 完整命令
    pub value: String,
    pub inferred_name: String,
}

fn is_url(input: &str) -> bool {
    input.starts_with("http://") || input.starts_with("https://")
}

/// 判断输入是否看起来像文件系统路径
pub fn looks_like_path(input: &str) -> bool {
    if input.starts_with('/') {
        return true;
    }
    if input.starts_with("~/") || input == "~" {
        return true;
    }
    if input.starts_with("./") || input.starts_with("../") {
        return true;
    }
    // Windows 驱动器路径
    if input.len() >= 3 {
        let bytes = input.as_bytes();
        if bytes[0].is_ascii_alphabetic() && bytes[1] == b':' && (bytes[2] == b'/' || bytes[2] == b'\\') {
            return true;
        }
    }
    false
}

fn is_command(input: &str) -> bool {
    if looks_like_path(input) {
        return true;
    }
    if input.contains(' ') {
        return true;
    }
    if input.starts_with("npx ")
        || input.starts_with("node ")
        || input.starts_with("python ")
    {
        return true;
    }
    false
}

fn is_package_name(input: &str) -> bool {
    // Scoped package
    if input.starts_with('@') && input.contains('/') {
        return true;
    }
    // Simple package name
    let re = regex_simple_pkg();
    re.is_match(input)
}

fn regex_simple_pkg() -> regex::Regex {
    // [a-z0-9][\w.-]*(@[\w.-]+)? 大小写不敏感
    regex::Regex::new(r"(?i)^[a-z0-9][\w.-]*(@[\w.-]+)?$").unwrap()
}

const COMMON_TLDS: &[&str] = &[
    "com", "org", "net", "io", "dev", "ai", "tech", "co", "app", "cloud", "sh", "run",
];

fn extract_brand_from_hostname(hostname: &str) -> String {
    let parts: Vec<&str> = hostname.split('.').collect();
    let meaningful: Vec<&str> = parts
        .iter()
        .filter(|part| {
            let lower = part.to_lowercase();
            !COMMON_TLDS.contains(&lower.as_str())
                && lower != "mcp"
                && lower != "api"
                && lower != "www"
        })
        .copied()
        .collect();

    if let Some(first) = meaningful.first() {
        return first.to_string();
    }

    if parts.len() >= 2 {
        return parts[parts.len() - 2].to_string();
    }

    "mcp-server".to_string()
}

fn extract_package_name(input: &str) -> String {
    let mut name = input.to_string();

    // 去除版本号
    if let Some(at_index) = name.rfind('@') {
        if at_index > 0 && !name.starts_with('@') {
            name = name[..at_index].to_string();
        } else if name.starts_with('@') {
            if let Some(second_at) = name[1..].find('@') {
                name = name[..=second_at].to_string();
            }
        }
    }

    // 提取 scoped 包名
    if name.starts_with('@') && name.contains('/') {
        if let Some(pos) = name.find('/') {
            name = name[pos + 1..].to_string();
        }
    }

    // 去除常见前缀/后缀
    name = name
        .strip_prefix("mcp-server-")
        .unwrap_or(&name)
        .to_string();
    name = name.strip_prefix("server-").unwrap_or(&name).to_string();
    name = name.strip_suffix("-mcp").unwrap_or(&name).to_string();

    if name.is_empty() {
        "mcp-server".to_string()
    } else {
        name
    }
}

fn infer_name(input: &str, source_type: &SourceType) -> String {
    match source_type {
        SourceType::Remote => {
            if let Ok(url) = url::Url::parse(input) {
                extract_brand_from_hostname(url.host_str().unwrap_or(""))
            } else {
                "mcp-server".to_string()
            }
        }
        SourceType::Command => {
            if looks_like_path(input) {
                let segments: Vec<&str> = input.split(['/', '\\']).collect();
                let base = segments.last().unwrap_or(&"mcp-server");
                let without_ext = base.rsplit_once('.').map(|(s, _)| s).unwrap_or(base);
                extract_package_name(without_ext)
            } else {
                let parts: Vec<&str> = input.split(' ').collect();
                let start = if parts.first().map(|s| *s == "npx" || *s == "node" || *s == "python").unwrap_or(false) {
                    1
                } else {
                    0
                };
                for part in &parts[start..] {
                    if !part.starts_with('-') {
                        return extract_package_name(part);
                    }
                }
                "mcp-server".to_string()
            }
        }
        SourceType::Package => extract_package_name(input),
    }
}

/// 解析用户输入的源
pub fn parse_source(input: &str) -> ParsedSource {
    let trimmed = input.trim();

    if is_url(trimmed) {
        return ParsedSource {
            source_type: SourceType::Remote,
            value: trimmed.to_string(),
            inferred_name: infer_name(trimmed, &SourceType::Remote),
        };
    }

    if is_command(trimmed) {
        return ParsedSource {
            source_type: SourceType::Command,
            value: trimmed.to_string(),
            inferred_name: infer_name(trimmed, &SourceType::Command),
        };
    }

    if is_package_name(trimmed) {
        return ParsedSource {
            source_type: SourceType::Package,
            value: trimmed.to_string(),
            inferred_name: infer_name(trimmed, &SourceType::Package),
        };
    }

    // 默认当作包名
    ParsedSource {
        source_type: SourceType::Package,
        value: trimmed.to_string(),
        inferred_name: infer_name(trimmed, &SourceType::Package),
    }
}

/// 根据解析结果构建 McpServerConfig
pub fn build_server_config(
    parsed: &ParsedSource,
    transport: Option<crate::agent::types::TransportType>,
    headers: &std::collections::HashMap<String, String>,
    env: &std::collections::HashMap<String, String>,
    args: &[String],
    timeout: Option<u32>,
    oauth_scopes: &[String],
    auto_approve_tools: Option<&[String]>,
) -> crate::agent::types::McpServerConfig {
    use crate::agent::types::{McpServerConfig, TransportType};
    use std::collections::HashMap;

    if parsed.source_type == SourceType::Remote {
        let mut config = McpServerConfig {
            r#type: Some(transport.unwrap_or(TransportType::Http)),
            url: Some(parsed.value.clone()),
            ..Default::default()
        };

        if !headers.is_empty() {
            config.headers = Some(headers.clone());
        }
        if let Some(t) = timeout {
            config.timeout = Some(t);
        }
        if !oauth_scopes.is_empty() {
            config.oauth_scopes = Some(oauth_scopes.to_vec());
        }
        if let Some(tools) = auto_approve_tools {
            config.auto_approve_tools = Some(tools.to_vec());
        }

        return config;
    }

    if parsed.source_type == SourceType::Command {
        let (command, parsed_args) = if looks_like_path(&parsed.value) {
            (parsed.value.clone(), Vec::new())
        } else {
            let parts: Vec<&str> = parsed.value.split(' ').collect();
            let cmd = parts.first().unwrap_or(&"").to_string();
            let rest: Vec<String> = parts[1..].iter().map(|s| s.to_string()).collect();
            (cmd, rest)
        };

        let mut all_args = parsed_args;
        all_args.extend_from_slice(args);

        let mut config = McpServerConfig {
            command: Some(command),
            args: Some(all_args),
            ..Default::default()
        };

        if !env.is_empty() {
            config.env = Some(env.clone());
        }
        if let Some(tools) = auto_approve_tools {
            config.auto_approve_tools = Some(tools.to_vec());
        }

        return config;
    }

    // Package
    let mut all_args = vec!["-y".to_string(), parsed.value.clone()];
    all_args.extend_from_slice(args);

    let mut config = McpServerConfig {
        command: Some("npx".to_string()),
        args: Some(all_args),
        ..Default::default()
    };

    if !env.is_empty() {
        let mut env_map = HashMap::new();
        for (k, v) in env {
            env_map.insert(k.clone(), v.clone());
        }
        config.env = Some(env_map);
    }
    if let Some(tools) = auto_approve_tools {
        config.auto_approve_tools = Some(tools.to_vec());
    }

    config
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn preserves_empty_auto_approve_as_approve_all() {
        let parsed = parse_source("https://mcp.example.com/mcp");
        let tools: Vec<String> = Vec::new();

        let config = build_server_config(
            &parsed,
            None,
            &HashMap::new(),
            &HashMap::new(),
            &[],
            None,
            &[],
            Some(&tools),
        );

        assert_eq!(config.auto_approve_tools, Some(Vec::new()));
    }
}
