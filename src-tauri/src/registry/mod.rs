// MCP Registry 搜索模块
// 参考: add-mcp/src/find.ts

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const DEFAULT_REGISTRY_URL: &str = "https://add-mcp.com/registry/api/v1/servers";
const OFFICIAL_REGISTRY_URL: &str = "https://registry.modelcontextprotocol.io/v0.1/servers";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryVariableDefinition {
    pub description: Option<String>,
    #[serde(rename = "isRequired")]
    pub is_required: Option<bool>,
    #[serde(rename = "isSecret")]
    pub is_secret: Option<bool>,
    pub default: Option<String>,
    pub choices: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryHeaderDefinition {
    pub name: String,
    pub description: Option<String>,
    #[serde(rename = "isRequired")]
    pub is_required: Option<bool>,
    #[serde(rename = "isSecret")]
    pub is_secret: Option<bool>,
    pub default: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RegistryRemoteTransport {
    StreamableHttp,
    Sse,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryRemoteDefinition {
    #[serde(rename = "type")]
    pub transport: RegistryRemoteTransport,
    pub url: String,
    pub variables: Option<HashMap<String, RegistryVariableDefinition>>,
    pub headers: Option<Vec<RegistryHeaderDefinition>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryPackageDefinition {
    #[serde(rename = "registryType")]
    pub registry_type: String,
    pub identifier: String,
    pub version: Option<String>,
    #[serde(rename = "runtimeArguments")]
    pub runtime_arguments: Option<Vec<String>>,
    #[serde(rename = "packageArguments")]
    pub package_arguments: Option<serde_json::Value>,
    #[serde(rename = "environmentVariables")]
    pub environment_variables: Option<HashMap<String, RegistryVariableDefinition>>,
    pub headers: Option<Vec<RegistryHeaderDefinition>>,
    pub transport: Option<RegistryRemoteTransport>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistryServerEntry {
    pub name: String,
    pub title: Option<String>,
    pub description: String,
    pub version: String,
    #[serde(rename = "repositoryUrl")]
    pub repository_url: Option<String>,
    pub remotes: Option<Vec<RegistryRemoteDefinition>>,
    pub package: Option<RegistryPackageDefinition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistrySearchResult {
    pub entries: Vec<RegistryServerEntry>,
    pub failed_registries: Vec<FailedRegistryInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FailedRegistryInfo {
    pub url: String,
    pub label: Option<String>,
    pub detail: String,
}

#[derive(Debug, Clone, Deserialize)]
struct RegistryResponse {
    servers: Vec<RegistryListItem>,
}

#[derive(Debug, Clone, Deserialize)]
struct RegistryListItem {
    server: Option<RegistryServerRaw>,
}

#[derive(Debug, Clone, Deserialize)]
struct RegistryServerRaw {
    name: Option<String>,
    title: Option<String>,
    description: Option<String>,
    version: Option<String>,
    repository: Option<RegistryRepoRaw>,
    remotes: Option<Vec<RegistryRemoteDefinition>>,
    packages: Option<Vec<RegistryPackageDefinition>>,
}

#[derive(Debug, Clone, Deserialize)]
struct RegistryRepoRaw {
    url: Option<String>,
}

/// 搜索 MCP Registry
pub async fn search_registry(query: &str) -> RegistrySearchResult {
    let registries = vec![
        (DEFAULT_REGISTRY_URL.to_string(), "add-mcp registry".to_string()),
        (OFFICIAL_REGISTRY_URL.to_string(), "Official Anthropic registry".to_string()),
    ];

    let mut entries = Vec::new();
    let mut failed = Vec::new();
    let mut seen = std::collections::HashSet::new();

    let client = reqwest::Client::new();

    for (url, label) in registries {
        let mut request_url = url::Url::parse(&url).unwrap();
        request_url
            .query_pairs_mut()
            .append_pair("version", "latest")
            .append_pair("limit", "100");
        if !query.is_empty() {
            request_url.query_pairs_mut().append_pair("search", query);
        }

        match client.get(request_url.as_str()).send().await {
            Ok(response) if response.status().is_success() => {
                match response.json::<RegistryResponse>().await {
                    Ok(payload) => {
                        for item in payload.servers {
                            if let Some(server) = item.server {
                                if let (Some(name), Some(desc), Some(ver)) =
                                    (server.name, server.description, server.version)
                                {
                                    let key = format!("{}@{}", name, ver);
                                    if seen.contains(&key) {
                                        continue;
                                    }
                                    seen.insert(key);

                                    let npm_package = server
                                        .packages
                                        .unwrap_or_default()
                                        .into_iter()
                                        .find(|p| p.registry_type == "npm");

                                    let has_remotes = server
                                        .remotes
                                        .as_ref()
                                        .map(|r| !r.is_empty())
                                        .unwrap_or(false);

                                    if npm_package.is_none() && !has_remotes {
                                        continue;
                                    }

                                    entries.push(RegistryServerEntry {
                                        name,
                                        title: server.title,
                                        description: desc,
                                        version: ver,
                                        repository_url: server.repository.and_then(|r| r.url),
                                        remotes: server.remotes,
                                        package: npm_package,
                                    });
                                }
                            }
                        }
                    }
                    Err(e) => {
                        failed.push(FailedRegistryInfo {
                            url,
                            label: Some(label),
                            detail: e.to_string(),
                        });
                    }
                }
            }
            Ok(response) => {
                failed.push(FailedRegistryInfo {
                    url,
                    label: Some(label),
                    detail: format!("HTTP {}", response.status()),
                });
            }
            Err(e) => {
                failed.push(FailedRegistryInfo {
                    url,
                    label: Some(label),
                    detail: e.to_string(),
                });
            }
        }
    }

    entries.sort_by(|a, b| {
        let score_b = registry_rank_score(b, query);
        let score_a = registry_rank_score(a, query);
        score_b
            .cmp(&score_a)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    RegistrySearchResult {
        entries,
        failed_registries: failed,
    }
}

fn registry_rank_score(entry: &RegistryServerEntry, query: &str) -> i32 {
    let mut score = 0;
    let haystack = format!(
        "{} {} {} {} {}",
        entry.name,
        entry.title.as_deref().unwrap_or_default(),
        entry.description,
        entry.repository_url.as_deref().unwrap_or_default(),
        entry
            .package
            .as_ref()
            .map(|p| p.identifier.as_str())
            .unwrap_or_default()
    )
    .to_lowercase();

    let name = entry.name.to_lowercase();
    let package = entry
        .package
        .as_ref()
        .map(|p| p.identifier.to_lowercase())
        .unwrap_or_default();

    if name.starts_with("@modelcontextprotocol/")
        || package.starts_with("@modelcontextprotocol/")
        || name.starts_with("io.modelcontextprotocol.")
    {
        score += 120;
    }
    if name.contains("context7") || package.contains("context7") {
        score += 50;
    }
    if package.starts_with("@upstash/")
        || package.starts_with("@sentry/")
        || package.starts_with("@playwright/")
        || package.starts_with("@browserbase/")
    {
        score += 30;
    }
    if entry.remotes.as_ref().map(|r| !r.is_empty()).unwrap_or(false) {
        score += 8;
    }
    if entry.package.is_some() {
        score += 5;
    }
    if haystack.contains("smithery") || package.starts_with("@smithery/") {
        score -= 80;
    }

    for token in query
        .to_lowercase()
        .split_whitespace()
        .filter(|token| !token.is_empty())
    {
        if name == token {
            score += 80;
        } else if name.contains(token) {
            score += 45;
        } else if haystack.contains(token) {
            score += 15;
        }
    }

    score
}
