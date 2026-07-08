// Tauri invoke/listen 封装
// 所有后端通信统一经过这里，方便维护和类型检查

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  AddServerRequest,
  AddServerResult,
  AgentInfo,
  AgentWithServers,
  LogPayload,
  RegistrySearchResult,
  RemoveResult,
  RemoveServerRequest,
  RuntimeInfo,
  ServerProbe,
  ServerStatus,
  StartServerRequest,
  SyncResult,
} from "./types";

// ── Agent 相关 ──

export const fetchAllAgents = (): Promise<AgentInfo[]> =>
  invoke("list_all_agents");

export const fetchAgentsWithServers = (
  scope?: "local" | "global",
  cwd?: string,
): Promise<AgentWithServers[]> =>
  invoke("get_agents_with_servers", { scope: scope ?? null, cwd: cwd ?? null });

// ── Server 配置管理 ──

export const addMcpServer = (req: AddServerRequest): Promise<AddServerResult[]> =>
  invoke("add_mcp_server", { req });

export const removeMcpServer = (req: RemoveServerRequest): Promise<RemoveResult[]> =>
  invoke("remove_mcp_server", { req });

export const syncServers = (scope: "local" | "global", cwd?: string): Promise<SyncResult> =>
  invoke("sync_servers", { scope, cwd: cwd ?? null });

// ── 进程管理 ──

export const startServerProcess = (req: StartServerRequest): Promise<number> =>
  invoke("start_server_process", { req });

export const stopServerProcess = (serverName: string): Promise<void> =>
  invoke("stop_server_process", { serverName });

export const getServerStatuses = (servers?: ServerProbe[]): Promise<ServerStatus[]> =>
  invoke("get_server_statuses", { servers: servers ?? null });

export const sendJsonRpc = (serverName: string, message: string): Promise<void> =>
  invoke("send_jsonrpc", { serverName, message });

// ── Registry 搜索 ──

export const searchMcpRegistry = (query: string): Promise<RegistrySearchResult> =>
  invoke("search_mcp_registry", { query });

// ── 配置与环境检测 ──

export const detectRuntimes = (): Promise<RuntimeInfo> =>
  invoke("detect_runtimes");

export const getConfigPreview = (
  agentType: string,
  scope: "local" | "global",
  cwd?: string,
): Promise<string> =>
  invoke("get_config_preview", { agentType, scope, cwd: cwd ?? null });

// ── 事件监听 ──

/** 监听指定 Server 的日志流 */
export function listenToLogStream(
  serverName: string,
  callback: (payload: LogPayload) => void,
): Promise<UnlistenFn> {
  return listen<LogPayload>(`mcp-log-${serverName}`, (event) => {
    callback(event.payload);
  });
}

/** 监听指定 Server 的进程退出事件 */
export function listenToProcessExit(
  serverName: string,
  callback: () => void,
): Promise<UnlistenFn> {
  return listen(`mcp-process-exited-${serverName}`, () => {
    callback();
  });
}
