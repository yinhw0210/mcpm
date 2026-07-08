// 通用工具函数

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** cn: 合并 Tailwind CSS class 名称 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 缩短路径显示（home 目录替换为 ~） */
export function shortenPath(path: string): string {
  const home = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>).__homeDir as string | undefined : undefined;
  if (home && path.startsWith(home)) {
    return path.replace(home, "~");
  }
  if (path.startsWith("/Users/") || path.startsWith("/home/")) {
    const parts = path.split("/");
    if (parts.length >= 3) {
      return path.replace(`/${parts[1]}/${parts[2]}`, "~");
    }
  }
  return path;
}

/** 格式化运行时间 */
export function formatUptime(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

/** 格式化内存 */
export function formatMemory(mb: number): string {
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

/** 获取 Agent 的图标 emoji（简化版） */
export function getAgentIcon(agentType: string): string {
  const icons: Record<string, string> = {
    "claude-code": "🤖",
    "claude-desktop": "🖥️",
    cursor: "↖️",
    codex: "📦",
    vscode: "💻",
    "gemini-cli": "💎",
    zed: "⚡",
    windsurf: "🏄",
    opencode: "🔓",
    cline: "📏",
    "cline-cli": "📏",
    goose: "🪿",
    antigravity: "🪐",
    "github-copilot-cli": "🐙",
    mcporter: "🚢",
  };
  return icons[agentType] ?? "🔌";
}

/** 判断 Server 配置是否为远程类型 */
export function isRemoteServer(config: Record<string, unknown>): boolean {
  return !!(config.url || config.uri || config.serverUrl);
}

/** 从 Server 配置中提取类型 */
export function getServerType(config: Record<string, unknown>): "remote" | "stdio" {
  return isRemoteServer(config) ? "remote" : "stdio";
}
