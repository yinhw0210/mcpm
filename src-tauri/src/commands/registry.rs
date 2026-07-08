// Registry 搜索 Tauri Commands

use crate::registry::{search_registry, RegistrySearchResult};

/// 搜索 MCP Registry
#[tauri::command]
pub async fn search_mcp_registry(query: String) -> Result<RegistrySearchResult, String> {
    Ok(search_registry(&query).await)
}
