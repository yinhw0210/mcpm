// 前后端共享的类型定义
// 与 Rust 端的 serde 序列化字段对齐

export type AgentType =
  | "antigravity"
  | "cline"
  | "cline-cli"
  | "claude-code"
  | "claude-desktop"
  | "codewhale"
  | "codex"
  | "catpaw"
  | "cursor"
  | "deepseek-reasonix"
  | "gemini-cli"
  | "goose"
  | "github-copilot-cli"
  | "kimi-code"
  | "kiro"
  | "mcporter"
  | "mimocode"
  | "opencode"
  | "qoder"
  | "trae-cn"
  | "trae-international"
  | "vscode"
  | "workbuddy"
  | "windsurf"
  | "zed"
  | "zcode";

export type TransportType = "http" | "sse";

export type ConfigFormat = "json" | "yaml" | "toml";

export type Scope = "local" | "global";

/** MCP Server 配置（统一格式） */
export interface McpServerConfig {
  type?: TransportType;
  url?: string;
  headers?: Record<string, string>;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
  oauthScopes?: string[];
  autoApproveTools?: string[];
}

/** 已安装的 Server */
export interface InstalledServer {
  serverName: string;
  config: Record<string, unknown>;
  identity: string;
  agentType: string;
  scope: Scope;
  configPath: string;
}

/** Agent 及其 Server 列表 */
export interface AgentWithServers {
  agentType: string;
  displayName: string;
  detected: boolean;
  configPath: string;
  localConfigPath?: string;
  supportsProject: boolean;
  globalServers: InstalledServer[];
  localServers: InstalledServer[];
}

/** Agent 精简信息 */
export interface AgentInfo {
  agentType: string;
  displayName: string;
  supportsProject: boolean;
  supportedTransports: string[];
  configPath: string;
  localConfigPath?: string;
}

/** 添加 Server 请求 */
export interface AddServerRequest {
  target: string;
  serverName?: string;
  agents: string[];
  scope: Scope;
  cwd?: string | null;
  transport?: TransportType;
  headers?: Record<string, string> | null;
  timeout?: number | null;
  oauthScopes?: string[] | null;
  env?: Record<string, string> | null;
  args?: string[] | null;
  autoApproveTools?: string[] | null;
}

/** 添加 Server 结果 */
export interface AddServerResult {
  success: boolean;
  agentType: string;
  configPath: string;
  error?: string;
  droppedFields: string[];
}

/** 删除 Server 请求 */
export interface RemoveServerRequest {
  serverName: string;
  agents: string[];
  scope: Scope;
  cwd?: string | null;
}

/** 删除 Server 结果 */
export interface RemoveResult {
  agentType: string;
  success: boolean;
  removed: boolean;
  error?: string;
}

/** 同步结果 */
export interface SyncResult {
  success: boolean;
  message: string;
  renames: SyncChange[];
  additions: SyncChange[];
  skipped: SyncSkip[];
}

export interface SyncChange {
  agentType: string;
  serverName: string;
  oldName?: string;
}

export interface SyncSkip {
  identity: string;
  reason: string;
}

/** 运行中 Server 的状态 */
export interface ServerStatus {
  name: string;
  pid: number | null;
  uptimeSecs: number;
  cpuUsage: number;
  memoryMb: number;
  isRunning: boolean;
  statusType: "managed" | "remote";
  detail?: string | null;
}

/** 运行状态探针 */
export interface ServerProbe {
  name: string;
  config: McpServerConfig;
}

/** 日志事件载荷 */
export interface LogPayload {
  stream: "stdout" | "stderr";
  line: string;
  timestamp: string;
}

/** 运行时信息 */
export interface RuntimeInfo {
  nodejs: string | null;
  npx: string | null;
  python: string | null;
  bun: string | null;
  uvx: string | null;
}

/** Registry 搜索结果 */
export interface RegistryServerEntry {
  name: string;
  title?: string;
  description: string;
  version: string;
  repositoryUrl?: string;
  remotes?: RegistryRemoteDefinition[];
  package?: RegistryPackageDefinition;
}

export interface RegistryRemoteDefinition {
  type: "streamable-http" | "sse";
  url: string;
  variables?: Record<string, RegistryVariableDefinition>;
  headers?: RegistryHeaderDefinition[];
}

export interface RegistryPackageDefinition {
  registryType: string;
  identifier: string;
  version?: string;
  runtimeArguments?: string[];
  packageArguments?: unknown;
  environmentVariables?: Record<string, RegistryVariableDefinition>;
  headers?: RegistryHeaderDefinition[];
  transport?: "streamable-http" | "sse";
}

export interface RegistryVariableDefinition {
  description?: string;
  isRequired?: boolean;
  isSecret?: boolean;
  default?: string;
  choices?: string[];
}

export interface RegistryHeaderDefinition {
  name: string;
  description?: string;
  isRequired?: boolean;
  isSecret?: boolean;
  default?: string;
}

export interface RegistrySearchResult {
  entries: RegistryServerEntry[];
  failedRegistries: { url: string; label?: string; detail: string }[];
}

/** 启动 Server 进程请求 */
export interface StartServerRequest {
  serverName: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  transport?: TransportType;
}
