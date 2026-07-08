// 配置管理器 — Minimal Tool 风格 (A2 Design)

import { useEffect, useState } from "react";
import { Plus, RefreshCw, DownloadCloud, Trash2, Activity, Globe, Folder } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ServerForm } from "@/components/server/ServerForm";
import { useAgentStore } from "@/stores/agentStore";
import { removeMcpServer, syncServers } from "@/lib/tauri";
import { cn, isRemoteServer } from "@/lib/utils";
import { AgentIcon } from "@/components/agent/AgentIcon";
import { toast } from "sonner";
import type { InstalledServer, AgentWithServers } from "@/lib/types";
import { useLanguageStore, type Language } from "@/stores/languageStore";

const text = {
  zh: {
    agents: "智能体",
    refresh: "刷新",
    sync: "同步",
    selectAgent: "选择一个智能体",
    addServer: "添加 Server",
    selectAgentHint: "从左侧选择一个智能体查看其配置的 MCP Server",
    globalConfig: "全局配置",
    projectConfig: "项目配置",
    emptyGlobal: "暂无全局 Server",
    emptyProject: "暂无项目级 Server",
    installed: "已安装",
    notDetected: "未检测",
    detail: "详情",
    delete: "删除",
    removed: (agent: string, server: string) => `已从 ${agent} 删除 ${server}`,
    removeFailed: (error: unknown) => `删除失败: ${error}`,
    syncSkipped: (items: string) => `部分同步已跳过：${items}`,
    syncFailed: (error: unknown) => `同步失败: ${error}`,
  },
  en: {
    agents: "Agents",
    refresh: "Refresh",
    sync: "Sync",
    selectAgent: "Select an agent",
    addServer: "Add server",
    selectAgentHint: "Select an agent on the left to inspect its MCP servers",
    globalConfig: "Global config",
    projectConfig: "Project config",
    emptyGlobal: "No global servers",
    emptyProject: "No project servers",
    installed: "Installed",
    notDetected: "Not detected",
    detail: "Details",
    delete: "Delete",
    removed: (agent: string, server: string) => `Removed ${server} from ${agent}`,
    removeFailed: (error: unknown) => `Remove failed: ${error}`,
    syncSkipped: (items: string) => `Some sync items were skipped: ${items}`,
    syncFailed: (error: unknown) => `Sync failed: ${error}`,
  },
};

export function ConfigManager() {
  const { agentsWithServers, fetchAgentsWithServers, loading } = useAgentStore();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { language } = useLanguageStore();
  const t = text[language];

  useEffect(() => {
    fetchAgentsWithServers();
  }, [fetchAgentsWithServers]);

  const detectedAgents = agentsWithServers.filter((a) => a.detected).map((a) => a.agentType);

  const handleRemove = async (server: InstalledServer) => {
    try {
      await removeMcpServer({
        serverName: server.serverName,
        agents: [server.agentType],
        scope: server.scope,
        cwd: null,
      });
      toast.success(t.removed(server.agentType, server.serverName));
      fetchAgentsWithServers();
    } catch (e) {
      toast.error(t.removeFailed(e));
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncServers("global");
      if (result.success) {
        toast.success(result.message);
        if (result.skipped.length > 0) {
          toast.warning(
            t.syncSkipped(result.skipped.map((item) => `${item.identity}: ${item.reason}`).join(language === "zh" ? "；" : "; ")),
          );
        }
        fetchAgentsWithServers();
      } else {
        toast.error(result.message);
      }
    } catch (e) {
      toast.error(t.syncFailed(e));
    } finally {
      setSyncing(false);
    }
  };

  const selectedAgentData = agentsWithServers.find((a) => a.agentType === selectedAgent);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* 左侧：Agent 列表 */}
      <div className="w-72 flex flex-col border-r border-[var(--border)] bg-[var(--background)]">
        {/* 表头 */}
        <div className="flex h-12 shrink-0 items-center justify-between px-4 bg-[var(--secondary)]/30 border-b border-[var(--border)]">
          <span className="text-sm font-semibold">{t.agents}</span>
          <div className="flex gap-1">
            <button
              onClick={() => fetchAgentsWithServers()}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              title={t.refresh}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50"
              title={t.sync}
            >
              <DownloadCloud className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Agent 列表 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {agentsWithServers.map((agent) => (
            <AgentRow
              key={agent.agentType}
              agent={agent}
              selected={selectedAgent === agent.agentType}
              onClick={() => setSelectedAgent(agent.agentType)}
              language={language}
            />
          ))}
        </div>
      </div>

      {/* 右侧：选中 Agent 的 Server 列表 */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {selectedAgentData && (
                <AgentIcon agentType={selectedAgentData.agentType} size="lg" />
              )}
              {selectedAgentData?.displayName ?? t.selectAgent}
            </h1>
            {selectedAgentData && (
              <p className="text-xs font-mono text-[var(--muted-foreground)] mt-1.5">
                {selectedAgentData.configPath}
              </p>
            )}
          </div>
          {selectedAgentData && (
            <Button onClick={() => setFormOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              {t.addServer}
            </Button>
          )}
        </div>

        {!selectedAgentData ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-12 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              {t.selectAgentHint}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 全局 Server */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-semibold">{t.globalConfig}</h2>
                <span className="px-1.5 py-0.5 rounded text-xs bg-[var(--secondary)] text-[var(--muted-foreground)] font-mono">
                  {selectedAgentData.globalServers.length}
                </span>
              </div>
              {selectedAgentData.globalServers.length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)] py-4">{t.emptyGlobal}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedAgentData.globalServers.map((server, idx) => (
                    <ConfigServerCard
                      key={`${server.serverName}-${idx}`}
                      server={server}
                      onRemove={() => handleRemove(server)}
                      language={language}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 项目级 Server */}
            {selectedAgentData.supportsProject && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-sm font-semibold">{t.projectConfig}</h2>
                  <span className="px-1.5 py-0.5 rounded text-xs bg-[var(--secondary)] text-[var(--muted-foreground)] font-mono">
                    {selectedAgentData.localServers.length}
                  </span>
                </div>
                {selectedAgentData.localServers.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)] py-4">{t.emptyProject}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedAgentData.localServers.map((server, idx) => (
                      <ConfigServerCard
                        key={`${server.serverName}-${idx}`}
                        server={server}
                        onRemove={() => handleRemove(server)}
                        language={language}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <ServerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        agents={agentsWithServers.map((a) => ({
          agentType: a.agentType,
          displayName: a.displayName,
          supportsProject: a.supportsProject,
          supportedTransports: [],
          configPath: a.configPath,
          localConfigPath: a.localConfigPath,
        }))}
        detectedAgents={detectedAgents}
        onSuccess={() => fetchAgentsWithServers()}
      />
    </div>
  );
}

/** Agent 行 — 极简风格 */
function AgentRow({
  agent,
  selected,
  onClick,
  language,
}: {
  agent: AgentWithServers;
  selected: boolean;
  onClick: () => void;
  language: Language;
}) {
  const t = text[language];
  const totalServers = agent.globalServers.length + agent.localServers.length;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-2 cursor-pointer transition-colors",
        selected
          ? "border-[var(--primary)] bg-[var(--accent)]"
          : "border-transparent hover:bg-[var(--accent)]",
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--secondary)]">
        <AgentIcon agentType={agent.agentType} size="md" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate">{agent.displayName}</span>
          {agent.detected ? (
            <span className="text-[10px] font-medium text-green-500 bg-green-500/10 px-1 rounded border border-green-500/20 shrink-0">
              {t.installed}
            </span>
          ) : (
            <span className="text-[10px] font-medium text-[var(--muted-foreground)] border border-[var(--border)] px-1 rounded shrink-0">
              {t.notDetected}
            </span>
          )}
        </div>
        <div className="text-xs font-mono text-[var(--muted-foreground)] mt-0.5">
          {totalServers} Servers
        </div>
      </div>
    </div>
  );
}

/** 配置页 Server 卡片 — A2 设计风格 */
function ConfigServerCard({
  server,
  onRemove,
  language,
}: {
  server: InstalledServer;
  onRemove: () => void;
  language: Language;
}) {
  const t = text[language];
  const isRemote = isRemoteServer(server.config);
  const config = server.config as Record<string, unknown>;

  // 提取命令预览
  const commandPreview = isRemote
    ? (config.url as string) ?? (config.serverUrl as string) ?? ""
    : [config.command as string, ...(config.args as string[] ?? [])].filter(Boolean).join(" ");

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 hover:bg-[var(--accent)] transition-colors flex flex-col gap-3 group shadow-sm">
      {/* 名称 + 类型标签 */}
      <div className="flex items-start justify-between">
        <Link
          to={`/server/${encodeURIComponent(server.serverName)}`}
          className="text-sm font-medium hover:underline truncate text-[var(--foreground)]"
        >
          {server.serverName}
        </Link>
        {isRemote ? (
          <div className="inline-flex items-center rounded border border-transparent bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-500 shrink-0">
            sse
          </div>
        ) : (
          <div className="inline-flex items-center rounded border border-[var(--border)] bg-[var(--secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] shrink-0">
            stdio
          </div>
        )}
      </div>

      {/* Agent + 范围信息 */}
      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <span className="inline-flex items-center gap-1">
          <AgentIcon agentType={server.agentType} size="sm" />
          {server.agentType}
        </span>
        <span>•</span>
        <span className="inline-flex items-center gap-1">
          {server.scope === "global" ? (
            <Globe className="h-3 w-3" />
          ) : (
            <Folder className="h-3 w-3" />
          )}
          {server.scope}
        </span>
      </div>

      {/* 底部：命令预览 + 操作按钮 */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] mt-auto">
        <div className="flex gap-3 text-xs text-[var(--muted-foreground)] font-mono">
          <span className="truncate max-w-[120px]" title={commandPreview || "-"}>
            {commandPreview || "-"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to={`/server/${encodeURIComponent(server.serverName)}`}
            className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            title={t.detail}
          >
            <Activity className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={onRemove}
            className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
            title={t.delete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
