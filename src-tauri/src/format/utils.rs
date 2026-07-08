// 格式处理工具函数
// 参考: add-mcp/src/formats/utils.ts

use serde_json::Value;

/// 获取嵌套值（支持点号分隔的 key，如 "mcpServers" 或 "a.b.c"）
pub fn get_nested_value<'a>(config: &'a Value, key: &str) -> Option<&'a Value> {
    let parts: Vec<&str> = key.split('.').collect();
    let mut current = config;
    for part in parts {
        current = current.get(part)?;
    }
    Some(current)
}

/// 提取 Server 的身份标识（URL 或 包名/命令）
/// 参考: add-mcp/src/reader.ts 中的 extractServerIdentity
pub fn extract_server_identity(server_config: &Value) -> String {
    // 远程: url, uri, serverUrl
    for key in &["url", "uri", "serverUrl"] {
        if let Some(val) = server_config.get(key).and_then(|v| v.as_str()) {
            if !val.is_empty() {
                return val.to_string();
            }
        }
    }

    // stdio: command/cmd + args
    let command = server_config
        .get("command")
        .and_then(|v| v.as_str())
        .or_else(|| server_config.get("cmd").and_then(|v| v.as_str()));

    let command = match command {
        Some(c) => c.to_string(),
        None => return String::new(),
    };

    let args: Vec<String> = if let Some(arr) = server_config.get("args").and_then(|v| v.as_array())
    {
        arr.iter()
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect()
    } else {
        vec![]
    };

    // 检测 npx -y <package> 模式
    if command == "npx" || command == "bunx" {
        let y_index = args.iter().position(|a| a == "-y");
        let pkg_index = y_index.map(|i| i + 1).unwrap_or(0);
        if let Some(pkg) = args.get(pkg_index) {
            if !pkg.starts_with('-') {
                return pkg.clone();
            }
        }
    }

    if !args.is_empty() {
        return format!("{} {}", command, args.join(" "));
    }

    command
}
