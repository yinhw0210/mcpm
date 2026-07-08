// Agent 卡片组件 — Minimal Tool 风格

import { cn } from "@/lib/utils";
import { AgentIcon } from "@/components/agent/AgentIcon";
import { Badge } from "@/components/ui/badge";
import type { AgentWithServers } from "@/lib/types";

interface AgentCardProps {
  agent: AgentWithServers;
  onClick?: () => void;
  selected?: boolean;
}

export function AgentCard({ agent, onClick, selected }: AgentCardProps) {
  const totalServers = agent.globalServers.length + agent.localServers.length;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md border p-2.5 transition-colors cursor-pointer",
        selected
          ? "border-[var(--primary)] bg-[var(--accent)]"
          : "border-transparent hover:bg-[var(--accent)]",
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--secondary)] shrink-0">
        <AgentIcon agentType={agent.agentType} size="md" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{agent.displayName}</span>
          {agent.detected ? (
            <Badge variant="success" className="text-[9px] px-1 py-0">已安装</Badge>
          ) : (
            <span className="inline-flex items-center rounded border border-[var(--border)] px-1 py-0 text-[9px] font-medium text-[var(--muted-foreground)]">
              未检测
            </span>
          )}
        </div>
        <div className="text-xs text-[var(--muted-foreground)] font-mono">
          {totalServers} servers
        </div>
      </div>
    </div>
  );
}
