// MCP 管理器 — 左侧 Server 菜单 + 右侧 Agent 三列卡片

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Copy,
  ExternalLink,
  Folder,
  Globe,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { AgentIcon } from "@/components/agent/AgentIcon";
import { ServerForm } from "@/components/server/ServerForm";
import { Switch } from "@/components/ui/switch";
import { useAgentStore } from "@/stores/agentStore";
import { addMcpServer, removeMcpServer } from "@/lib/tauri";
import { cn, isRemoteServer } from "@/lib/utils";
import { toast } from "sonner";
import type { AgentInfo, AgentWithServers, InstalledServer } from "@/lib/types";
import { useLanguageStore, type Language } from "@/stores/languageStore";

type AgentView = "installed" | "all";

const text = {
  zh: {
    title: "MCP 管理",
    subtitle: "左侧选择服务，右侧用智能体卡片管理启用状态",
    refresh: "刷新",
    add: "新增",
    servers: "服务",
    links: "启用关系",
    installedAgents: "已安装智能体",
    remote: "远程",
    searchServer: "搜索服务",
    noServers: "暂无匹配的服务",
    orphanedConfig: "未安装配置",
    selectServer: "从左侧选择一个服务",
    configureOthers: "配置其他智能体",
    details: "调试详情",
    installedTab: "已安装智能体",
    allTab: "全部智能体",
    searchAgent: "搜索智能体",
    emptyAgents: "当前筛选下没有智能体",
    drawerTitle: "配置其他智能体",
    drawerDesc: "未安装也可以预写配置",
    copied: "路径已复制",
    copyFailed: "复制失败",
    disabled: "已禁用",
    enabled: "已启用",
    noConfig: "未找到可复制的配置",
    operationFailed: "操作失败",
    available: "可启用",
    configuredUninstalled: "未安装已配置",
    notInstalled: "未安装",
    installed: "已安装",
    global: "全局",
    local: "项目",
    mixed: "混合",
    none: "无",
    noOtherAgents: "没有其他智能体",
    close: "关闭",
  },
  en: {
    title: "MCP Management",
    subtitle: "Select an MCP server on the left, then manage agent cards on the right",
    refresh: "Refresh",
    add: "Add",
    servers: "Servers",
    links: "Links",
    installedAgents: "Installed agents",
    remote: "Remote",
    searchServer: "Search MCP servers",
    noServers: "No matching MCP servers",
    orphanedConfig: "Uninstalled config",
    selectServer: "Select an MCP server on the left",
    configureOthers: "Configure other agents",
    details: "Debug details",
    installedTab: "Installed agents",
    allTab: "All agents",
    searchAgent: "Search agents",
    emptyAgents: "No agents match the current filter",
    drawerTitle: "Configure other agents",
    drawerDesc: "Write configs even when the app is not installed",
    copied: "Path copied",
    copyFailed: "Copy failed",
    disabled: "Disabled",
    enabled: "Enabled",
    noConfig: "No reusable config found",
    operationFailed: "Operation failed",
    available: "Available",
    configuredUninstalled: "Configured",
    notInstalled: "Not installed",
    installed: "Installed",
    global: "Global",
    local: "Project",
    mixed: "Mixed",
    none: "None",
    noOtherAgents: "No other agents",
    close: "Close",
  },
};

interface McpAgentState {
  agentType: string;
  displayName: string;
  detected: boolean;
  enabled: boolean;
  scope: "local" | "global";
  configPath: string;
  installed: InstalledServer | null;
}

interface McpGroup {
  serverName: string;
  isRemote: boolean;
  transportLabel: string;
  commandPreview: string;
  agents: McpAgentState[];
}

function remoteTargetFromConfig(config: Record<string, unknown>): string {
  return (
    (config.url as string | undefined) ??
    (config.uri as string | undefined) ??
    (config.serverUrl as string | undefined) ??
    ""
  );
}

function commandPreviewFromConfig(config: Record<string, unknown>, isRemote: boolean): string {
  if (isRemote) return remoteTargetFromConfig(config);
  return [config.command as string | undefined, ...((config.args as string[] | undefined) ?? [])]
    .filter(Boolean)
    .join(" ");
}

function transportLabelFromConfig(config: Record<string, unknown>, isRemote: boolean): string {
  if (!isRemote) return "stdio";
  const raw = (config.type as string | undefined) ?? (config.transport as string | undefined);
  if (!raw) return "http";
  return raw.toLowerCase().includes("sse") ? "sse" : "http";
}

function configSummary(group: McpGroup): Record<string, unknown> | null {
  return (group.agents.find((agent) => agent.enabled)?.installed?.config as Record<string, unknown>) ?? null;
}

function scopeSummary(group: McpGroup): "global" | "local" | "mixed" | "none" {
  const enabled = group.agents.filter((agent) => agent.enabled);
  if (enabled.length === 0) return "none";
  const scopes = new Set(enabled.map((agent) => agent.scope));
  return scopes.size > 1 ? "mixed" : enabled[0].scope;
}

function normalizeAgent(agent: AgentInfo | AgentWithServers): AgentInfo & { detected?: boolean } {
  return {
    agentType: agent.agentType,
    displayName: agent.displayName,
    supportsProject: agent.supportsProject,
    supportedTransports: "supportedTransports" in agent ? agent.supportedTransports : [],
    configPath: agent.configPath,
    localConfigPath: agent.localConfigPath,
    detected: "detected" in agent ? agent.detected : undefined,
  };
}

export function McpManager() {
  const { agents, agentsWithServers, fetchAgents, fetchAgentsWithServers, loading } = useAgentStore();
  const { language } = useLanguageStore();
  const t = text[language];
  const [selectedMcp, setSelectedMcp] = useState<string | null>(null);
  const [serverQuery, setServerQuery] = useState("");
  const [agentQuery, setAgentQuery] = useState("");
  const [agentView, setAgentView] = useState<AgentView>("installed");
  const [formOpen, setFormOpen] = useState(false);
  const [otherAgentsOpen, setOtherAgentsOpen] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const agentListRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetchAgents();
    fetchAgentsWithServers();
  }, [fetchAgents, fetchAgentsWithServers]);

  // 切换标签页或服务时，重置右侧智能体列表滚动位置到顶部
  useEffect(() => {
    if (agentListRef.current) {
      agentListRef.current.scrollTop = 0;
    }
  }, [agentView, selectedMcp]);

  const detectedAgentTypes = useMemo(
    () => new Set(agentsWithServers.filter((agent) => agent.detected).map((agent) => agent.agentType)),
    [agentsWithServers],
  );

  const allAgents = useMemo(() => {
    const source = agents.length > 0 ? agents : agentsWithServers;
    return source
      .map(normalizeAgent)
      .map((agent) => ({
        ...agent,
        detected: agent.detected ?? detectedAgentTypes.has(agent.agentType),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [agents, agentsWithServers, detectedAgentTypes]);

  const mcpGroups = useMemo<McpGroup[]>(() => {
    const map = new Map<string, McpGroup>();

    for (const agent of agentsWithServers) {
      const allServers = [
        ...agent.globalServers.map((server) => ({ server, scope: "global" as const })),
        ...agent.localServers.map((server) => ({ server, scope: "local" as const })),
      ];

      for (const { server, scope } of allServers) {
        if (!map.has(server.serverName)) {
          const config = server.config as Record<string, unknown>;
          const isRemote = isRemoteServer(server.config);

          map.set(server.serverName, {
            serverName: server.serverName,
            isRemote,
            transportLabel: transportLabelFromConfig(config, isRemote),
            commandPreview: commandPreviewFromConfig(config, isRemote),
            agents: [],
          });
        }

        const group = map.get(server.serverName)!;
        group.agents.push({
          agentType: agent.agentType,
          displayName: agent.displayName,
          detected: agent.detected,
          enabled: true,
          scope,
          configPath: server.configPath,
          installed: server,
        });
      }
    }

    for (const group of map.values()) {
      const enabledTypes = new Set(group.agents.map((agent) => agent.agentType));
      for (const agent of allAgents) {
        if (!enabledTypes.has(agent.agentType)) {
          group.agents.push({
            agentType: agent.agentType,
            displayName: agent.displayName,
            detected: Boolean(agent.detected),
            enabled: false,
            scope: "global",
            configPath: agent.configPath,
            installed: null,
          });
        }
      }

      group.agents.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }

    return Array.from(map.values()).sort((a, b) => a.serverName.localeCompare(b.serverName));
  }, [agentsWithServers, allAgents]);

  const filteredGroups = useMemo(() => {
    const query = serverQuery.trim().toLowerCase();
    if (!query) return mcpGroups;
    return mcpGroups.filter((group) => {
      const enabledAgentNames = group.agents
        .filter((agent) => agent.enabled)
        .map((agent) => agent.displayName)
        .join(" ")
        .toLowerCase();

      return (
        group.serverName.toLowerCase().includes(query) ||
        group.commandPreview.toLowerCase().includes(query) ||
        group.transportLabel.toLowerCase().includes(query) ||
        enabledAgentNames.includes(query)
      );
    });
  }, [mcpGroups, serverQuery]);

  const activeGroup =
    filteredGroups.find((group) => group.serverName === selectedMcp) ?? filteredGroups[0] ?? null;

  const installedAgents = activeGroup?.agents.filter((agent) => agent.detected) ?? [];
  const otherAgents = activeGroup?.agents.filter((agent) => !agent.detected) ?? [];

  const visibleAgents = useMemo(() => {
    if (!activeGroup) return [];
    const query = agentQuery.trim().toLowerCase();
    const base = agentView === "installed" ? activeGroup.agents.filter((agent) => agent.detected) : activeGroup.agents;

    if (!query) return base;
    return base.filter(
      (agent) =>
        agent.displayName.toLowerCase().includes(query) ||
        agent.agentType.toLowerCase().includes(query) ||
        agent.configPath.toLowerCase().includes(query),
    );
  }, [activeGroup, agentQuery, agentView]);

  const handleToggle = async (
    group: McpGroup,
    agentType: string,
    currentlyEnabled: boolean,
    installed: InstalledServer | null,
  ) => {
    setToggling(`${group.serverName}-${agentType}`);

    try {
      if (currentlyEnabled && installed) {
        await removeMcpServer({
          serverName: group.serverName,
          agents: [agentType],
          scope: installed.scope,
          cwd: null,
        });
        toast.success(`${t.disabled}: ${group.serverName}`);
      } else if (!currentlyEnabled) {
        const config = configSummary(group);
        if (!config) {
          toast.error(`${t.noConfig}: ${group.serverName}`);
          return;
        }

        await addMcpServer({
          target: group.isRemote
            ? remoteTargetFromConfig(config)
            : (config.command as string | undefined) ?? "",
          serverName: group.serverName,
          agents: [agentType],
          scope: "global",
          cwd: null,
          transport: group.isRemote ? (group.transportLabel === "sse" ? "sse" : "http") : undefined,
          headers: group.isRemote ? (config.headers as Record<string, string> | undefined) ?? null : null,
          env: !group.isRemote ? (config.env as Record<string, string> | undefined) ?? null : null,
          args: !group.isRemote ? (config.args as string[] | undefined) ?? null : null,
          timeout: null,
          oauthScopes: null,
          autoApproveTools: null,
        });
        toast.success(`${t.enabled}: ${group.serverName}`);
      }

      fetchAgentsWithServers();
    } catch (error) {
      toast.error(`${t.operationFailed}: ${error}`);
    } finally {
      setToggling(null);
    }
  };

  const totalEnabledLinks = mcpGroups.reduce(
    (sum, group) => sum + group.agents.filter((agent) => agent.enabled).length,
    0,
  );
  const remoteCount = mcpGroups.filter((group) => group.isRemote).length;
  const detectedAgents = agentsWithServers.filter((agent) => agent.detected).map((agent) => agent.agentType);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--background)]">
      <header className="shrink-0 border-b border-[var(--border)] bg-[var(--card)] px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{t.title}</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {t.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAgentsWithServers()}
              className="flex h-9 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium transition-colors hover:bg-[var(--accent)]"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              {t.refresh}
            </button>
            <button
              onClick={() => setFormOpen(true)}
              className="flex h-9 items-center gap-2 rounded-md bg-[var(--primary)] px-3 text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.add}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
          <span className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1">
            {mcpGroups.length} {t.servers}
          </span>
          <span className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1">
            {totalEnabledLinks} {t.links}
          </span>
          <span className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1">
            {detectedAgentTypes.size} {t.installedAgents}
          </span>
          <span className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1">
            {remoteCount} {t.remote}
          </span>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-hidden">
        <aside className="flex min-h-0 min-w-0 flex-col border-r border-[var(--border)] bg-[var(--card)]">
          <div className="border-b border-[var(--border)] p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                value={serverQuery}
                onChange={(event) => setServerQuery(event.target.value)}
                placeholder={t.searchServer}
                className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {filteredGroups.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">
                {t.noServers}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredGroups.map((group) => {
                  const enabledCount = group.agents.filter((agent) => agent.enabled).length;
                  const installedEnabled = group.agents.filter((agent) => agent.enabled && agent.detected).length;
                  const orphanedCount = group.agents.filter((agent) => agent.enabled && !agent.detected).length;
                  const active = activeGroup?.serverName === group.serverName;

                  return (
                    <button
                      key={group.serverName}
                      onClick={() => {
                        setSelectedMcp(group.serverName);
                        setOtherAgentsOpen(false);
                      }}
                      className={cn(
                        "w-full rounded-md border p-3 text-left transition-colors",
                        active
                          ? "border-[var(--primary)] bg-[var(--accent)]"
                          : "border-transparent hover:border-[var(--border)] hover:bg-[var(--accent)]/50",
                      )}
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <span
                          className={cn(
                            "mt-1 h-2 w-2 shrink-0 rounded-full",
                            group.isRemote ? "bg-blue-500" : "bg-green-500",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="break-words text-sm font-semibold leading-5">
                            {group.serverName}
                          </div>
                          <div className="mt-1 line-clamp-2 break-all font-mono text-[11px] leading-4 text-[var(--muted-foreground)]">
                            {group.commandPreview || "-"}
                          </div>
                        </div>
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="rounded bg-[var(--secondary)] px-1.5 py-0.5 font-medium text-[var(--muted-foreground)]">
                          {group.transportLabel}
                        </span>
                        <span className="rounded bg-green-500/15 px-1.5 py-0.5 font-medium text-green-700 dark:text-green-400">
                          {installedEnabled}/{enabledCount}
                        </span>
                        {orphanedCount > 0 && (
                          <span className="rounded bg-yellow-500/15 px-1.5 py-0.5 font-medium text-yellow-700 dark:text-yellow-400">
                            {t.orphanedConfig} {orphanedCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="min-h-0 min-w-0 overflow-hidden">
          {!activeGroup ? (
            <div className="flex h-full items-center justify-center p-8 text-sm text-[var(--muted-foreground)]">
              {t.selectServer}
            </div>
          ) : (
            <div className="flex h-full min-w-0 flex-col">
              <section className="shrink-0 border-b border-[var(--border)] bg-[var(--card)] px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-xl font-bold leading-7">
                        {activeGroup.serverName}
                      </h2>
                      <span
                        className={cn(
                          "rounded-md border px-2 py-1 text-[10px] font-medium",
                          activeGroup.isRemote
                            ? "border-blue-500/20 bg-blue-500/15 text-blue-600 dark:text-blue-400"
                            : "border-[var(--border)] bg-[var(--secondary)] text-[var(--secondary-foreground)]",
                        )}
                      >
                        {activeGroup.transportLabel}
                      </span>
                      <span className="rounded-md border border-[var(--border)] px-2 py-1 text-[10px] font-medium text-[var(--muted-foreground)]">
                        {t[scopeSummary(activeGroup)]}
                      </span>
                    </div>
                    <div className="mt-3 max-w-4xl">
                      <PathPill path={activeGroup.commandPreview || "-"} language={language} />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => setOtherAgentsOpen(true)}
                      className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 text-xs font-medium transition-colors hover:bg-[var(--accent)]"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      {t.configureOthers}
                    </button>
                    <Link
                      to={`/server/${encodeURIComponent(activeGroup.serverName)}`}
                      className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 text-xs font-medium transition-colors hover:bg-[var(--accent)]"
                    >
                      {t.details}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {[
                    { key: "installed" as const, label: t.installedTab, count: installedAgents.length },
                    { key: "all" as const, label: t.allTab, count: activeGroup.agents.length },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setAgentView(item.key)}
                      className={cn(
                        "h-8 rounded-md border px-3 text-xs font-medium transition-colors",
                        agentView === item.key
                          ? "border-[var(--primary)] bg-[var(--accent)] text-[var(--foreground)]"
                          : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
                      )}
                    >
                      {item.label}
                      <span className="ml-1 font-mono">{item.count}</span>
                    </button>
                  ))}
                  <div className="relative ml-auto min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <input
                      value={agentQuery}
                      onChange={(event) => setAgentQuery(event.target.value)}
                      placeholder={t.searchAgent}
                      className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]"
                    />
                  </div>
                </div>
              </section>

              <section ref={agentListRef} className="min-h-0 flex-1 overflow-y-auto p-5">
                {visibleAgents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)] p-10 text-center text-sm text-[var(--muted-foreground)]">
                    {t.emptyAgents}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                    {visibleAgents.map((agent) => (
                      <AgentToggleCard
                        key={`${agent.agentType}-${agent.scope}-${agent.configPath}`}
                        agent={agent}
                        activeGroup={activeGroup}
                        toggling={toggling}
                        language={language}
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>

      {activeGroup && otherAgentsOpen && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label={t.close}
            onClick={() => setOtherAgentsOpen(false)}
            className="absolute inset-0 cursor-default bg-black/20"
          />
          <div className="absolute inset-y-0 right-0 flex w-[380px] max-w-[calc(100vw-24px)] flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-lg">
            <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{t.drawerTitle}</div>
                <div className="truncate text-xs text-[var(--muted-foreground)]">{t.drawerDesc}</div>
              </div>
              <button
                onClick={() => setOtherAgentsOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-[var(--accent)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {otherAgents.length === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">
                  {t.noOtherAgents}
                </div>
              ) : (
                <div className="space-y-2">
                  {otherAgents.map((agent) => (
                    <AgentToggleCard
                      key={`${agent.agentType}-${agent.scope}-${agent.configPath}`}
                      agent={agent}
                      activeGroup={activeGroup}
                      compact
                      toggling={toggling}
                      language={language}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ServerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        agents={agentsWithServers.map((agent) => ({
          agentType: agent.agentType,
          displayName: agent.displayName,
          supportsProject: agent.supportsProject,
          supportedTransports: [],
          configPath: agent.configPath,
          localConfigPath: agent.localConfigPath,
        }))}
        detectedAgents={detectedAgents}
        onSuccess={() => fetchAgentsWithServers()}
      />
    </div>
  );
}

function AgentToggleCard({
  agent,
  activeGroup,
  compact,
  toggling,
  language,
  onToggle,
}: {
  agent: McpAgentState;
  activeGroup: McpGroup;
  compact?: boolean;
  toggling: string | null;
  language: Language;
  onToggle: (
    group: McpGroup,
    agentType: string,
    currentlyEnabled: boolean,
    installed: InstalledServer | null,
  ) => Promise<void>;
}) {
  const t = text[language];
  const isToggling = toggling === `${activeGroup.serverName}-${agent.agentType}`;
  const statusLabel = agent.detected
    ? agent.enabled
      ? t.enabled
      : t.available
    : agent.enabled
      ? t.configuredUninstalled
      : t.notInstalled;
  const disabled = isToggling;
  const triggerToggle = () => {
    if (!disabled) {
      onToggle(activeGroup, agent.agentType, agent.enabled, agent.installed);
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={triggerToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          triggerToggle();
        }
      }}
      className={cn(
        "group flex h-[86px] w-full min-w-0 items-center gap-3 rounded-lg border bg-[var(--card)] p-3 text-left transition-colors",
        agent.enabled
          ? "border-green-500/30 bg-green-500/5 hover:bg-green-500/10"
          : "border-[var(--border)] hover:bg-[var(--accent)]/60",
        !agent.detected && "border-dashed opacity-90",
        compact && "h-[78px] rounded-md p-2.5",
        isToggling && "cursor-wait opacity-50",
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)]">
        <AgentIcon agentType={agent.agentType} size="md" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate text-sm font-semibold">{agent.displayName}</span>
          <span
            className={cn(
              "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium",
              agent.detected
                ? agent.enabled
                  ? "border-green-500/20 bg-green-500/15 text-green-700 dark:text-green-400"
                  : "border-[var(--border)] text-[var(--muted-foreground)]"
                : "border-yellow-500/20 bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
            )}
          >
            {statusLabel}
          </span>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
          {agent.scope === "local" ? <Folder className="h-3 w-3 shrink-0" /> : <Globe className="h-3 w-3 shrink-0" />}
          <span className="shrink-0">{agent.scope === "local" ? t.local : t.global}</span>
          <PathPill path={agent.configPath || "-"} language={language} />
        </div>
      </div>

      <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
        <Switch
          checked={agent.enabled}
          disabled={isToggling}
          onCheckedChange={() => onToggle(activeGroup, agent.agentType, agent.enabled, agent.installed)}
        />
      </div>
    </div>
  );
}

function PathPill({ path, language }: { path: string; language: Language }) {
  const t = text[language];

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(path);
      toast.success(t.copied);
    } catch {
      toast.error(t.copyFailed);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={path}
      className="flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-left font-mono text-[11px] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)]"
    >
      <span className="min-w-0 flex-1 truncate">{path}</span>
      <Copy className="h-3 w-3 shrink-0" />
    </button>
  );
}
