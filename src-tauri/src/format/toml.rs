// TOML 格式配置文件读写
// 参考: add-mcp/src/formats/toml.ts

use serde_json::Value;
use std::fs;
use std::path::Path;
use toml::Value as TomlValue;

/// 将 serde_json::Value 转为 toml::Value
fn json_to_toml(value: &Value) -> TomlValue {
    match value {
        Value::Null => TomlValue::String("".to_string()),
        Value::Bool(b) => TomlValue::Boolean(*b),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                TomlValue::Integer(i)
            } else if let Some(f) = n.as_f64() {
                TomlValue::Float(f)
            } else {
                TomlValue::String(n.to_string())
            }
        }
        Value::String(s) => TomlValue::String(s.clone()),
        Value::Array(arr) => {
            TomlValue::Array(arr.iter().map(json_to_toml).collect())
        }
        Value::Object(map) => {
            let mut table = toml::value::Table::new();
            for (k, v) in map {
                table.insert(k.clone(), json_to_toml(v));
            }
            TomlValue::Table(table)
        }
    }
}

/// 将 toml::Value 转为 serde_json::Value
fn toml_to_json(value: &TomlValue) -> Value {
    match value {
        TomlValue::Boolean(b) => Value::Bool(*b),
        TomlValue::Integer(i) => Value::Number((*i).into()),
        TomlValue::Float(f) => {
            serde_json::Number::from_f64(*f).map(Value::Number).unwrap_or(Value::Null)
        }
        TomlValue::String(s) => Value::String(s.clone()),
        TomlValue::Datetime(dt) => Value::String(dt.to_string()),
        TomlValue::Array(arr) => {
            Value::Array(arr.iter().map(toml_to_json).collect())
        }
        TomlValue::Table(table) => {
            let mut map = serde_json::Map::new();
            for (k, v) in table {
                map.insert(k.clone(), toml_to_json(v));
            }
            Value::Object(map)
        }
    }
}

/// 读取 TOML 配置文件
pub fn read_toml(file_path: &str) -> Value {
    if !Path::new(file_path).exists() {
        return Value::Object(serde_json::Map::new());
    }
    match fs::read_to_string(file_path) {
        Ok(content) => {
            match toml::from_str::<TomlValue>(&content) {
                Ok(v) => toml_to_json(&v),
                Err(_) => Value::Object(serde_json::Map::new()),
            }
        }
        Err(_) => Value::Object(serde_json::Map::new()),
    }
}

/// 写入 TOML 配置文件
pub fn write_toml(
    file_path: &str,
    config_key: &str,
    server_name: &str,
    server_config: &Value,
) -> Result<(), String> {
    let mut config = read_toml(file_path);
    if !config.is_object() {
        config = Value::Object(serde_json::Map::new());
    }

    // 嵌套设置
    let parts: Vec<&str> = config_key.split('.').collect();
    let mut current = &mut config;

    for (i, part) in parts.iter().enumerate() {
        if i == parts.len() - 1 {
            let servers = current
                .as_object_mut()
                .ok_or("Config is not an object")?
                .entry(part.to_string())
                .or_insert_with(|| Value::Object(serde_json::Map::new()));
            if !servers.is_object() {
                *servers = Value::Object(serde_json::Map::new());
            }
            servers
                .as_object_mut()
                .unwrap()
                .insert(server_name.to_string(), server_config.clone());
        } else {
            let next = current
                .as_object_mut()
                .ok_or("Config is not an object")?
                .entry(part.to_string())
                .or_insert_with(|| Value::Object(serde_json::Map::new()));
            if !next.is_object() {
                *next = Value::Object(serde_json::Map::new());
            }
            current = next;
        }
    }

    let toml_value = json_to_toml(&config);
    let toml_str = toml::to_string_pretty(&toml_value).map_err(|e| e.to_string())?;

    if let Some(parent) = Path::new(file_path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::write(file_path, &toml_str).map_err(|e| e.to_string())
}

/// 从 TOML 配置中删除指定 Server
pub fn remove_toml_key(
    file_path: &str,
    config_key: &str,
    server_name: &str,
) -> Result<bool, String> {
    if !Path::new(file_path).exists() {
        return Ok(false);
    }

    let mut config = read_toml(file_path);
    let parts: Vec<&str> = config_key.split('.').collect();
    let mut current = &mut config;

    for (i, part) in parts.iter().enumerate() {
        if i == parts.len() - 1 {
            if let Some(servers) = current.as_object_mut().and_then(|m| m.get_mut(*part)) {
                if let Some(servers_map) = servers.as_object_mut() {
                    if servers_map.remove(server_name).is_some() {
                        let toml_value = json_to_toml(&config);
                        let toml_str =
                            toml::to_string_pretty(&toml_value).map_err(|e| e.to_string())?;
                        fs::write(file_path, &toml_str).map_err(|e| e.to_string())?;
                        return Ok(true);
                    }
                }
            }
            return Ok(false);
        } else {
            match current.as_object_mut().and_then(|m| m.get_mut(*part)) {
                Some(v) if v.is_object() => current = v,
                _ => return Ok(false),
            }
        }
    }

    Ok(false)
}
