// Agent 多选器组件 — SuperDesign 风格 (A2 Design)
// 信息密集、紧凑的 Agent 选择网格

import { cn } from "@/lib/utils";
import { AgentIcon } from "@/components/agent/AgentIcon";
import type { AgentInfo } from "@/lib/types";
import { Check } from "lucide-react";
import { useLanguageStore } from "@/stores/languageStore";

interface AgentSelectorProps {
  agents: AgentInfo[];
  selected: string[];
  onChange: (selected: string[]) => void;
  detectedAgents?: string[];
}

export function AgentSelector({ agents, selected, onChange, detectedAgents }: AgentSelectorProps) {
  const { language } = useLanguageStore();
  const installedLabel = language === "zh" ? "已安装" : "Installed";

  const toggle = (agentType: string) => {
    if (selected.includes(agentType)) {
      onChange(selected.filter((a) => a !== agentType));
    } else {
      onChange([...selected, agentType]);
    }
  };

  // 排序：已选中的在前，已检测的其次，其他在后
  const sorted = [...agents].sort((a, b) => {
    const aSelected = selected.includes(a.agentType) ? 0 : 1;
    const bSelected = selected.includes(b.agentType) ? 0 : 1;
    if (aSelected !== bSelected) return aSelected - bSelected;

    const aDetected = detectedAgents?.includes(a.agentType) ? 0 : 1;
    const bDetected = detectedAgents?.includes(b.agentType) ? 0 : 1;
    if (aDetected !== bDetected) return aDetected - bDetected;

    return a.displayName.localeCompare(b.displayName);
  });

  return (
    <div className="grid grid-cols-3 gap-2">
      {sorted.map((agent) => {
        const isSelected = selected.includes(agent.agentType);
        const isDetected = detectedAgents?.includes(agent.agentType);

        return (
          <button
            key={agent.agentType}
            onClick={() => toggle(agent.agentType)}
            className={cn(
              "group flex items-center gap-2 rounded-md border p-2 text-left transition-all",
              isSelected
                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/30 hover:bg-[var(--accent)]",
            )}
          >
            {/* 选中指示器 */}
            <div
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all",
                isSelected
                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "border-[var(--border)] bg-transparent group-hover:border-[var(--primary)]/50"
              )}
            >
              {isSelected && <Check className="h-3 w-3" />}
            </div>

            {/* Agent 图标 */}
            <AgentIcon agentType={agent.agentType} size="sm" />

            {/* Agent 信息 */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate text-[var(--foreground)]">
                {agent.displayName}
              </div>
              {isDetected && (
                <div className="text-[10px] text-green-600">{installedLabel}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
