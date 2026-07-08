// Server 状态看板 — Minimal Tool 风格

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Clock, RefreshCw, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAgentStore } from "@/stores/agentStore";
import { useServerProcessStore } from "@/stores/serverStore";
import { stopServerProcess } from "@/lib/tauri";
import { formatUptime, formatMemory, isRemoteServer } from "@/lib/utils";
import { buildServerProbes } from "@/lib/serverProbes";
import { AgentIcon } from "@/components/agent/AgentIcon";
import { toast } from "sonner";
import type { InstalledServer, ServerStatus } from "@/lib/types";
import { useLanguageStore } from "@/stores/languageStore";

const text = {
  zh: {
    title: "看板",
    subtitle: "配置覆盖、远程可访问性与调试会话",
    remoteReachable: "远程可访问 / 远程总数",
    debugResources: "调试会话资源",
    remoteAndDebug: "远程状态与调试会话",
    emptyStatus: "暂无远程 Server 或调试会话",
    name: "名称",
    type: "类型",
    status: "状态",
    detail: "详情",
    remote: "远程",
    debug: "调试",
    reachable: "可访问",
    unreachable: "不可达",
    running: "运行中",
    stopDebug: "停止调试",
    activityLog: "活动日志",
    noActivity: "暂无活动记录",
    waitingSync: "等待状态同步...",
    configuredServers: "已配置 Server",
    noConfiguredServers: "还没有配置任何 MCP Server",
    goToMcp: "前往 MCP 管理",
    debugRunning: "调试中",
    configuredToAgents: (count: number) => `已配置到 ${count} 个 Agent`,
    management: "管理启用状态",
    stoppedDebug: (name: string) => `Server "${name}" 调试会话已停止`,
    stopFailed: (error: unknown) => `停止失败: ${error}`,
  },
  en: {
    title: "Dashboard",
    subtitle: "Config coverage, remote reachability, and debug sessions",
    remoteReachable: "Reachable remote / total remote",
    debugResources: "Debug session resources",
    remoteAndDebug: "Remote status and debug sessions",
    emptyStatus: "No remote servers or debug sessions",
    name: "Name",
    type: "Type",
    status: "Status",
    detail: "Detail",
    remote: "Remote",
    debug: "Debug",
    reachable: "Reachable",
    unreachable: "Unreachable",
    running: "Running",
    stopDebug: "Stop debug",
    activityLog: "Activity log",
    noActivity: "No activity yet",
    waitingSync: "Waiting for status sync...",
    configuredServers: "Configured servers",
    noConfiguredServers: "No MCP servers configured yet",
    goToMcp: "Open MCP Management",
    debugRunning: "Debugging",
    configuredToAgents: (count: number) => `Configured in ${count} agent${count === 1 ? "" : "s"}`,
    management: "Manage enabled agents",
    stoppedDebug: (name: string) => `Server "${name}" debug session stopped`,
    stopFailed: (error: unknown) => `Stop failed: ${error}`,
  },
};

interface ConfiguredServerGroup {
  key: string;
  serverName: string;
  primary: InstalledServer;
  servers: InstalledServer[];
  isRemote: boolean;
}

export function Dashboard() {
  const { agentsWithServers, fetchAgentsWithServers } = useAgentStore();
  const { statuses, refreshStatuses } = useServerProcessStore();
  const { language } = useLanguageStore();
  const t = text[language];
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    fetchAgentsWithServers();
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString(language === "zh" ? "zh-CN" : "en-US", { hour12: false }));
    }, 1000);
    return () => {
      clearInterval(clockInterval);
    };
  }, [fetchAgentsWithServers, language]);

  const allServers = useMemo(() => {
    const servers: { server: InstalledServer; agentType: string }[] = [];
    for (const agent of agentsWithServers) {
      for (const s of [...agent.globalServers, ...agent.localServers]) {
        servers.push({ server: s, agentType: agent.agentType });
      }
    }
    return servers;
  }, [agentsWithServers]);

  const configuredGroups = useMemo(() => groupConfiguredServers(allServers), [allServers]);
  const serverProbes = useMemo(
    () => buildServerProbes(configuredGroups.map((group) => ({ server: group.primary }))),
    [configuredGroups],
  );
  const primaryStatuses = statuses.filter((s) => s.statusType === "remote" || s.statusType === "managed");
  const resourceStatuses = statuses.filter((s) => s.isRunning && s.statusType === "managed");
  const remoteStatuses = statuses.filter((s) => s.statusType === "remote");
  const reachableRemoteCount = remoteStatuses.filter((s) => s.isRunning).length;
  const debugCount = resourceStatuses.length;
  const totalServers = configuredGroups.length;
  const totalCpu = resourceStatuses.reduce((sum, s) => sum + s.cpuUsage, 0);
  const totalMem = resourceStatuses.reduce((sum, s) => sum + s.memoryMb, 0);

  useEffect(() => {
    refreshStatuses(serverProbes);
    const interval = setInterval(() => refreshStatuses(serverProbes), 5000);
    return () => clearInterval(interval);
  }, [refreshStatuses, serverProbes]);

  const handleStop = async (serverName: string) => {
    try {
      await stopServerProcess(serverName);
      toast.success(t.stoppedDebug(serverName));
      refreshStatuses(serverProbes);
    } catch (e) {
      toast.error(t.stopFailed(e));
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{t.title}</h1>
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] px-2 py-1 rounded-md">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-mono">{currentTime || "--:--:--"}</span>
                <RefreshCw className="h-3 w-3 ml-1 text-[var(--primary)]" />
              </div>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {t.subtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* 左列：统计 + 状态 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 紧凑统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 远程可访问 */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 flex flex-col justify-between h-[84px]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[var(--muted-foreground)]">{t.remoteReachable}</span>
                  <span className="text-sm font-mono">
                    <span className="font-bold text-[var(--foreground)] text-base">{reachableRemoteCount}</span>
                    <span className="text-[var(--muted-foreground)]"> / {remoteStatuses.length}</span>
                  </span>
                </div>
                <div className="h-[2px] w-full bg-[var(--secondary)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 progress-bar"
                    style={{ width: `${remoteStatuses.length > 0 ? (reachableRemoteCount / remoteStatuses.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* 调试会话资源 */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 flex flex-col justify-between h-[84px]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[var(--muted-foreground)]">{t.debugResources}</span>
                  <span className="text-xs font-mono text-[var(--muted-foreground)]">
                    DEBUG: <span className="text-[var(--foreground)] font-bold text-sm">{debugCount}</span>
                    <span className="mx-1">|</span>
                    CPU: <span className="text-[var(--foreground)] font-bold text-sm">{totalCpu.toFixed(1)}%</span>
                    <span className="mx-1">|</span>
                    MEM: <span className="text-[var(--foreground)] font-bold text-sm">{formatMemory(totalMem)}</span>
                  </span>
                </div>
                <div className="flex gap-1 h-[2px] w-full">
                  <div className="bg-[var(--secondary)] rounded-full flex-1 overflow-hidden">
                    <div className="h-full bg-[var(--primary)] progress-bar" style={{ width: `${Math.min(totalCpu, 100)}%` }} />
                  </div>
                  <div className="bg-[var(--secondary)] rounded-full flex-1 overflow-hidden">
                    <div className="h-full bg-blue-500 progress-bar" style={{ width: `${Math.min((totalMem / 1024) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* 状态表 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">{t.remoteAndDebug}</h2>
              </div>
              {primaryStatuses.length === 0 ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-center">
                  <p className="text-sm text-[var(--muted-foreground)]">{t.emptyStatus}</p>
                </div>
              ) : (
                <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg overflow-hidden">
                  {/* 表头 */}
                  <div className="flex items-center px-4 py-2 bg-[var(--secondary)]/30 border-b border-[var(--border)] text-xs font-medium text-[var(--muted-foreground)]">
                    <div className="w-2 shrink-0 mr-4" />
                    <div className="flex-1">{t.name}</div>
                    <div className="w-20">{t.type}</div>
                    <div className="w-20">{t.status}</div>
                    <div className="w-40">{t.detail}</div>
                    <div className="w-6" />
                  </div>
                  {/* 表体 */}
                  <div className="divide-y divide-[var(--border)]">
                    {primaryStatuses.map((status) => (
                      <div key={status.name} className="flex items-center px-4 py-2.5 hover:bg-[var(--accent)] transition-colors">
                        <div className="h-2 w-2 rounded-full bg-green-500 shrink-0 mr-4" />
                        <Link
                          to={`/server/${encodeURIComponent(status.name)}`}
                          className="text-sm font-medium flex-1 truncate pr-4 text-[var(--foreground)] hover:underline"
                        >
                          {status.name}
                        </Link>
                        <div className="text-xs text-[var(--muted-foreground)] w-20">
                          {status.statusType === "remote" ? t.remote : t.debug}
                        </div>
                        <div className="text-xs w-20">
                          {status.statusType === "remote"
                            ? status.isRunning ? t.reachable : t.unreachable
                            : t.running}
                        </div>
                        <div className="text-xs font-mono text-[var(--muted-foreground)] w-40 truncate">
                          {status.statusType === "remote"
                            ? status.detail ?? "-"
                            : `PID ${status.pid ?? "-"} · ${formatUptime(status.uptimeSecs)} · ${status.cpuUsage.toFixed(1)}% · ${formatMemory(status.memoryMb)}`}
                        </div>
                        <div className="w-6 flex justify-end">
                          {status.statusType === "managed" && (
                            <button
                              onClick={() => handleStop(status.name)}
                              className="h-6 w-6 inline-flex items-center justify-center rounded text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                              title={t.stopDebug}
                            >
                              <span className="h-3 w-3 bg-current rounded-sm" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 右列：活动日志 */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] h-full flex flex-col">
              <div className="p-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--secondary)]/30">
                <h3 className="text-sm font-semibold">{t.activityLog}</h3>
                <span className="text-[10px] text-[var(--muted-foreground)] font-mono">LIVE</span>
              </div>
              <div className="p-4 flex-1 overflow-y-auto font-mono text-xs leading-relaxed space-y-1.5 text-[var(--foreground)]">
                {primaryStatuses.length > 0 ? (
                  primaryStatuses.map((s, idx) => (
                    <div key={idx} className="flex gap-3">
                      <span className="text-[var(--muted-foreground)] shrink-0">
                        {new Date().toLocaleTimeString(language === "zh" ? "zh-CN" : "en-US", { hour12: false })}
                      </span>
                      <span className="text-green-500 w-16 shrink-0">[{s.statusType.toUpperCase()}]</span>
                      <span className="truncate">{s.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[var(--muted-foreground)] text-center py-8 font-sans">
                    {t.noActivity}
                  </div>
                )}
                <div className="flex gap-3">
                  <span className="text-[var(--muted-foreground)] shrink-0">
                    {new Date().toLocaleTimeString(language === "zh" ? "zh-CN" : "en-US", { hour12: false })}
                  </span>
                  <span className="text-[var(--primary)] w-16 shrink-0">[SYNC]</span>
                  <span className="truncate text-[var(--muted-foreground)]">{t.waitingSync}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 已配置 Server — 按 MCP identity 分组 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{t.configuredServers}</h2>
            {totalServers > 0 && (
              <span className="text-xs text-[var(--muted-foreground)] font-mono">{totalServers} total</span>
            )}
          </div>
          {configuredGroups.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                {t.noConfiguredServers}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => (window.location.hash = "#/config")}
              >
                {t.goToMcp}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {configuredGroups.map((group) => {
                const status = statuses.find((s) => s.name === group.primary.serverName);
                return (
                  <MinimalServerCard
                    key={group.key}
                    group={group}
                    status={status}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/** 极简 Server 卡片 — A2 风格 */
function MinimalServerCard({
  group,
  status,
}: {
  group: ConfiguredServerGroup;
  status?: ServerStatus;
}) {
  const { language } = useLanguageStore();
  const t = text[language];
  const { primary, servers } = group;
  const isRemote = group.isRemote;
  const isRunning = status?.isRunning ?? false;
  const isManaged = status?.statusType === "managed";
  const isRemoteStatus = status?.statusType === "remote";
  const visibleAgents = servers.slice(0, 6);
  const hiddenAgentCount = Math.max(servers.length - visibleAgents.length, 0);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 hover:bg-[var(--accent)] transition-colors flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <Link
          to={`/server/${encodeURIComponent(primary.serverName)}`}
          className={`text-sm font-medium hover:underline truncate ${isRunning ? "" : "opacity-80"}`}
        >
          {group.serverName}
        </Link>
        {isManaged ? (
          <Badge variant="success" className="text-[10px] shrink-0">{t.debugRunning}</Badge>
        ) : isRemoteStatus && isRunning ? (
          <span className="inline-flex items-center rounded border border-transparent bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-600 shrink-0">
            {t.reachable}
          </span>
        ) : isRemoteStatus ? (
          <span className="inline-flex items-center rounded border border-transparent bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-500 shrink-0">
            {t.unreachable}
          </span>
        ) : isRemote ? (
          <span className="inline-flex items-center rounded border border-transparent bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-500 shrink-0">
            {t.remote}
          </span>
        ) : (
          <span className="inline-flex items-center rounded border border-[var(--border)] bg-transparent px-1.5 py-0.5 text-[10px] font-medium text-[var(--foreground)] shrink-0">
            stdio
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <span>{t.configuredToAgents(servers.length)}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 min-h-6">
        {visibleAgents.map((server) => (
          <span
            key={`${server.agentType}-${server.scope}-${server.configPath}`}
            className="inline-flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]"
            title={`${server.agentType} · ${server.scope}`}
          >
            <AgentIcon agentType={server.agentType} size="sm" className="h-3 w-3" />
            {server.agentType}
          </span>
        ))}
        {hiddenAgentCount > 0 && (
          <span className="inline-flex items-center rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
            +{hiddenAgentCount}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] mt-auto">
        <div className="flex gap-3 text-xs text-[var(--muted-foreground)] font-mono">
          {isRunning && status ? (
            <>
              {status.statusType === "remote" ? (
                <span>{status.detail ?? "HTTP"}</span>
              ) : (
                <>
                  <span>C: {status.cpuUsage.toFixed(1)}%</span>
                  <span>M: {formatMemory(status.memoryMb)}</span>
                </>
              )}
            </>
          ) : (
            <span className="opacity-50">-</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link
            to={`/server/${encodeURIComponent(primary.serverName)}`}
            className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            title={t.detail}
          >
            <Activity className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/mcp"
            className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            title={t.management}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function groupConfiguredServers(
  servers: { server: InstalledServer; agentType: string }[],
): ConfiguredServerGroup[] {
  const map = new Map<string, ConfiguredServerGroup>();

  for (const { server } of servers) {
    const key = server.identity || server.serverName;
    const existing = map.get(key);
    if (existing) {
      existing.servers.push(server);
      continue;
    }

    map.set(key, {
      key,
      serverName: server.serverName,
      primary: server,
      servers: [server],
      isRemote: isRemoteServer(server.config),
    });
  }

  return Array.from(map.values()).sort((a, b) =>
    a.serverName.localeCompare(b.serverName),
  );
}
