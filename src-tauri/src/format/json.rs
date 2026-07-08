// JSON 格式配置文件读写
// 参考: add-mcp/src/formats/json.ts

use serde_json::{Map, Value};
use std::fs;
use std::path::Path;

/// 读取 JSON 配置文件，不存在则返回空对象
pub fn read_json(file_path: &str) -> Value {
    if !Path::new(file_path).exists() {
        return Value::Object(Map::new());
    }
    match fs::read_to_string(file_path) {
        Ok(content) => {
            if content.trim().is_empty() {
                return Value::Object(Map::new());
            }
            match serde_json::from_str::<Value>(&content) {
                Ok(v) if v.is_object() => v,
                _ => Value::Object(Map::new()),
            }
        }
        Err(_) => Value::Object(Map::new()),
    }
}

/// 写入 JSON 配置文件（合并模式）
pub fn write_json(
    file_path: &str,
    config_key: &str,
    server_name: &str,
    server_config: &Value,
) -> Result<(), String> {
    let mut config = read_json(file_path);
    if !config.is_object() {
        config = Value::Object(Map::new());
    }

    let root = config.as_object_mut().ok_or("Config is not an object")?;

    // 导航/创建嵌套 key（如 "mcpServers" 或 "a.b.c"）
    let parts: Vec<&str> = config_key.split('.').collect();
    let mut current = root;

    for (i, part) in parts.iter().enumerate() {
        if i == parts.len() - 1 {
            // 最后一级：插入 server
            let servers = current
                .entry(part.to_string())
                .or_insert_with(|| Value::Object(Map::new()));
            if !servers.is_object() {
                *servers = Value::Object(Map::new());
            }
            if let Some(servers_map) = servers.as_object_mut() {
                servers_map.insert(server_name.to_string(), server_config.clone());
            }
        } else {
            let next = current
                .entry(part.to_string())
                .or_insert_with(|| Value::Object(Map::new()));
            if !next.is_object() {
                *next = Value::Object(Map::new());
            }
            current = next.as_object_mut().unwrap();
        }
    }

    // 确保目录存在
    if let Some(parent) = Path::new(file_path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let json_str = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(file_path, format!("{}\n", json_str)).map_err(|e| e.to_string())
}

/// 从 JSON 配置中删除指定 Server
pub fn remove_json_key(
    file_path: &str,
    config_key: &str,
    server_name: &str,
) -> Result<bool, String> {
    if !Path::new(file_path).exists() {
        return Ok(false);
    }

    let mut config = read_json(file_path);
    let root = config.as_object_mut().ok_or("Config is not an object")?;

    // 导航到嵌套位置
    let parts: Vec<&str> = config_key.split('.').collect();
    let mut current = root;

    for (i, part) in parts.iter().enumerate() {
        if i == parts.len() - 1 {
            if let Some(servers) = current.get_mut(*part) {
                if let Some(servers_map) = servers.as_object_mut() {
                    if servers_map.remove(server_name).is_some() {
                        let json_str =
                            serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
                        fs::write(file_path, format!("{}\n", json_str))
                            .map_err(|e| e.to_string())?;
                        return Ok(true);
                    }
                }
            }
            return Ok(false);
        } else {
            match current.get_mut(*part) {
                Some(v) if v.is_object() => {
                    current = v.as_object_mut().unwrap();
                }
                _ => return Ok(false),
            }
        }
    }

    Ok(false)
}
