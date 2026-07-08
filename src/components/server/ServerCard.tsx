// Server 卡片组件 — Minimal Tool 风格

import { Link } from "react-router-dom";
import { Activity, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isRemoteServer, formatMemory } from "@/lib/utils";
import { AgentIcon } from "@/components/agent/AgentIcon";
import type { InstalledServer, ServerStatus } from "@/lib/types";
import { useLanguageStore } from "@/stores/languageStore";

const text = {
  zh: {
    debugging: "调试中",
    reachable: "可访问",
    unreachable: "不可达",
    remote: "远程",
    detailsAndLogs: "详情与日志",
    delete: "删除",
  },
  en: {
    debugging: "Debugging",
    reachable: "Reachable",
    unreachable: "Unreachable",
    remote: "Remote",
    detailsAndLogs: "Details and logs",
    delete: "Delete",
  },
};

interface ServerCardProps {
  server: InstalledServer;
  status?: ServerStatus;
  onRemove?: () => void;
}

export function ServerCard({ server, status, onRemove }: ServerCardProps) {
  const { language } = useLanguageStore();
  const t = text[language];
  const isRemote = isRemoteServer(server.config);
  const isRunning = status?.isRunning ?? false;
  const isManaged = status?.statusType === "managed";
  const isRemoteStatus = status?.statusType === "remote";

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 hover:bg-[var(--accent)] transition-colors flex flex-col gap-3">
      {/* 名称 + 状态 */}
      <div className="flex items-start justify-between">
        <Link
          to={`/server/${encodeURIComponent(server.serverName)}`}
          className={`text-sm font-medium hover:underline truncate ${isRunning ? "" : "opacity-80"}`}
        >
          {server.serverName}
        </Link>
        {isManaged ? (
          <Badge variant="success" className="text-[10px] shrink-0">{t.debugging}</Badge>
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

      {/* Agent + Scope */}
      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <span className="inline-flex items-center gap-1">
          <AgentIcon agentType={server.agentType} size="sm" />
          {server.agentType}
        </span>
        <span>•</span>
        <span>{server.scope}</span>
      </div>

      {/* 底部：资源 + 操作 */}
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
            to={`/server/${encodeURIComponent(server.serverName)}`}
            className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            title={t.detailsAndLogs}
          >
            <Activity className="h-3.5 w-3.5" />
          </Link>
          {onRemove && (
            <button
              onClick={onRemove}
              className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
              title={t.delete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
