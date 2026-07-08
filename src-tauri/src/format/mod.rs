// 配置文件格式处理模块
// 参考: add-mcp/src/formats/

pub mod json;
pub mod toml;
pub mod yaml;
pub mod utils;

use crate::agent::types::ConfigFormat;

/// 读取配置文件
pub fn read_config_file(file_path: &str, format: ConfigFormat) -> serde_json::Value {
    match format {
        ConfigFormat::Json => json::read_json(file_path),
        ConfigFormat::Yaml => yaml::read_yaml(file_path),
        ConfigFormat::Toml => toml::read_toml(file_path),
    }
}

/// 写入配置文件（合并模式：读取已有配置 -> 更新指定 key -> 写回）
pub fn write_config_file(
    file_path: &str,
    format: ConfigFormat,
    config_key: &str,
    server_name: &str,
    server_config: &serde_json::Value,
) -> Result<(), String> {
    match format {
        ConfigFormat::Json => json::write_json(
            file_path,
            config_key,
            server_name,
            server_config,
        ),
        ConfigFormat::Yaml => yaml::write_yaml(
            file_path,
            config_key,
            server_name,
            server_config,
        ),
        ConfigFormat::Toml => toml::write_toml(
            file_path,
            config_key,
            server_name,
            server_config,
        ),
    }
}

/// 从配置文件中删除指定的 Server
pub fn remove_server_from_config(
    file_path: &str,
    format: ConfigFormat,
    config_key: &str,
    server_name: &str,
) -> Result<bool, String> {
    match format {
        ConfigFormat::Json => json::remove_json_key(file_path, config_key, server_name),
        ConfigFormat::Yaml => yaml::remove_yaml_key(file_path, config_key, server_name),
        ConfigFormat::Toml => toml::remove_toml_key(file_path, config_key, server_name),
    }
}

/// 获取嵌套值（支持点号分隔的 key）
pub fn get_nested_value<'a>(config: &'a serde_json::Value, key: &str) -> Option<&'a serde_json::Value> {
    utils::get_nested_value(config, key)
}
