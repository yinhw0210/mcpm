// Agent 图标组件 — 使用真实站点图标替代 emoji

import { cn } from "@/lib/utils";

interface AgentIconProps {
  agentType: string;
  className?: string;
  /** 图标尺寸，默认 h-5 w-5 */
  size?: "sm" | "md" | "lg";
}

/** 获取 Agent 图标的静态资源路径 */
export function getAgentIconPath(agentType: string): string {
  const iconMap: Record<string, string> = {
    "antigravity": "/agents/antigravity.ico",
    "cline": "/agents/cline.png",
    "cline-cli": "/agents/cline-cli.png",
    "claude-code": "/agents/claude-code.png",
    "claude-desktop": "/agents/claude-desktop.png",
    "codewhale": "/agents/deepseek-reasonix.ico",
    "codex": "/agents/codex.png",
    "catpaw": "/agents/catpaw.png",
    "cursor": "/agents/cursor.png",
    "deepseek-reasonix": "/agents/deepseek-reasonix.ico",
    "gemini-cli": "/agents/gemini-cli.png",
    "goose": "/agents/goose.ico",
    "github-copilot-cli": "/agents/github-copilot-cli.png",
    "kimi-code": "/agents/kimi-code.ico",
    "kiro": "/agents/kiro.png",
    "mcporter": "/agents/mcporter.png",
    "mimocode": "/agents/mimocode.ico",
    "opencode": "/agents/opencode.png",
    "qoder": "/agents/qoder.png",
    "trae-cn": "/agents/trae-cn.png",
    "trae-international": "/agents/trae-international.png",
    "vscode": "/agents/vscode.png",
    "workbuddy": "/agents/workbuddy.svg",
    "windsurf": "/agents/windsurf.ico",
    "zed": "/agents/zed.png",
    "zcode": "/agents/zcode.svg",
  };
  return iconMap[agentType] ?? "";
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function AgentIcon({ agentType, className, size = "md" }: AgentIconProps) {
  const src = getAgentIconPath(agentType);

  if (!src) {
    // 未知 agent，显示占位
    return (
      <div
        className={cn(
          "rounded bg-[var(--secondary)] flex items-center justify-center text-[10px] font-mono text-[var(--muted-foreground)]",
          sizeMap[size],
          className,
        )}
      >
        ?
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={agentType}
      className={cn("rounded object-contain", sizeMap[size], className)}
      draggable={false}
    />
  );
}
