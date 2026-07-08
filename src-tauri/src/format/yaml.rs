// YAML 格式配置文件读写
// 参考: add-mcp/src/formats/yaml.ts

use serde_json::Value;
use std::fs;
use std::path::Path;
use yaml_rust2::{Yaml, YamlEmitter, YamlLoader};

/// 将 serde_json::Value 转为 yaml_rust2::Yaml
fn json_to_yaml(value: &Value) -> Yaml {
    match value {
        Value::Null => Yaml::Null,
        Value::Bool(b) => Yaml::Boolean(*b),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Yaml::Integer(i)
            } else if let Some(f) = n.as_f64() {
                Yaml::Real(f.to_string())
            } else {
                Yaml::String(n.to_string())
            }
        }
        Value::String(s) => Yaml::String(s.clone()),
        Value::Array(arr) => {
            Yaml::Array(arr.iter().map(json_to_yaml).collect())
        }
        Value::Object(map) => {
            let mut hash = yaml_rust2::yaml::Hash::new();
            for (k, v) in map {
                hash.insert(Yaml::String(k.clone()), json_to_yaml(v));
            }
            Yaml::Hash(hash)
        }
    }
}

/// 将 yaml_rust2::Yaml 转为 serde_json::Value
fn yaml_to_json(yaml: &Yaml) -> Value {
    match yaml {
        Yaml::Null => Value::Null,
        Yaml::Boolean(b) => Value::Bool(*b),
        Yaml::Integer(i) => Value::Number((*i).into()),
        Yaml::Real(s) => {
            s.parse::<f64>().map(Value::from).unwrap_or(Value::Null)
        }
        Yaml::String(s) => Value::String(s.clone()),
        Yaml::Array(arr) => {
            Value::Array(arr.iter().map(yaml_to_json).collect())
        }
        Yaml::Hash(hash) => {
            let mut map = serde_json::Map::new();
            for (k, v) in hash {
                let key = match k {
                    Yaml::String(s) => s.clone(),
                    Yaml::Integer(i) => i.to_string(),
                    _ => continue,
                };
                map.insert(key, yaml_to_json(v));
            }
            Value::Object(map)
        }
        _ => Value::Null,
    }
}

/// 读取 YAML 配置文件
pub fn read_yaml(file_path: &str) -> Value {
    if !Path::new(file_path).exists() {
        return Value::Object(serde_json::Map::new());
    }
    match fs::read_to_string(file_path) {
        Ok(content) => {
            let docs = YamlLoader::load_from_str(&content).unwrap_or_default();
            if let Some(first) = docs.into_iter().next() {
                yaml_to_json(&first)
            } else {
                Value::Object(serde_json::Map::new())
            }
        }
        Err(_) => Value::Object(serde_json::Map::new()),
    }
}

/// 写入 YAML 配置文件
pub fn write_yaml(
    file_path: &str,
    config_key: &str,
    server_name: &str,
    server_config: &Value,
) -> Result<(), String> {
    let mut config = read_yaml(file_path);
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

    // 转换为 YAML 并写入
    let yaml_doc = json_to_yaml(&config);
    let mut out = String::new();
    {
        let mut emitter = YamlEmitter::new(&mut out);
        emitter
            .dump(&yaml_doc)
            .map_err(|e| format!("YAML emit error: {}", e))?;
    }

    if let Some(parent) = Path::new(file_path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::write(file_path, &out).map_err(|e| e.to_string())
}

/// 从 YAML 配置中删除指定 Server
pub fn remove_yaml_key(
    file_path: &str,
    config_key: &str,
    server_name: &str,
) -> Result<bool, String> {
    if !Path::new(file_path).exists() {
        return Ok(false);
    }

    let mut config = read_yaml(file_path);
    let parts: Vec<&str> = config_key.split('.').collect();
    let mut current = &mut config;

    for (i, part) in parts.iter().enumerate() {
        if i == parts.len() - 1 {
            if let Some(servers) = current.as_object_mut().and_then(|m| m.get_mut(*part)) {
                if let Some(servers_map) = servers.as_object_mut() {
                    if servers_map.remove(server_name).is_some() {
                        let yaml_doc = json_to_yaml(&config);
                        let mut out = String::new();
                        {
                            let mut emitter = YamlEmitter::new(&mut out);
                            emitter.dump(&yaml_doc).map_err(|e| e.to_string())?;
                        }
                        fs::write(file_path, &out).map_err(|e| e.to_string())?;
                        return Ok(true);
                    }
                }
            }
            return Ok(false);
        } else {
            match current
                .as_object_mut()
                .and_then(|m| m.get_mut(*part))
            {
                Some(v) if v.is_object() => current = v,
                _ => return Ok(false),
            }
        }
    }

    Ok(false)
}
