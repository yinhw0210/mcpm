// 添加/编辑 MCP Server 表单 — SuperDesign 风格 (A2 Design)
// 设计原则: 信息密集、功能优先、清晰的视觉层级

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AgentSelector } from "@/components/agent/AgentSelector";
import { addMcpServer } from "@/lib/tauri";
import type { AgentInfo, AddServerResult } from "@/lib/types";
import { toast } from "sonner";
import { FolderOpen, Globe, Package, Terminal } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/stores/languageStore";

const formText = {
  zh: {
    title: "添加服务",
    source: "服务源",
    sourcePlaceholder: "https://mcp.example.com/mcp 或 @modelcontextprotocol/server-filesystem",
    sourceRequired: "请输入服务源",
    selectAgentRequired: "请至少选择一个智能体",
    projectDirRequired: "项目安装需要先选择项目目录",
    timeoutInvalid: "超时时间必须是大于 0 的数字",
    unknownError: "未知错误",
    added: "成功添加到",
    agentsUnit: "个智能体",
    dropped: "部分字段不受支持，已跳过：",
    failed: "个智能体添加失败：",
    addFailed: "添加失败",
    projectDir: "项目目录",
    choose: "选择",
    projectHint: "项目安装会写入所选目录下的项目级配置",
    nameOptional: "名称（可选）",
    autoDetect: "自动推断",
    scope: "安装范围",
    global: "全局",
    local: "项目",
    transport: "传输类型：",
    headers: "请求头（可选）",
    oauthScopes: "授权范围（可选）",
    env: "环境变量（可选）",
    args: "额外参数（可选）",
    timeout: "超时时间（秒，可选）",
    autoApprove: "自动批准工具",
    autoApprovePlaceholder: "留空表示全部工具，或用逗号分隔",
    targetAgents: "目标智能体",
    cancel: "取消",
    installing: "安装中",
    install: "安装",
    parseError: "格式错误",
  },
  en: {
    title: "Add server",
    source: "Server source",
    sourcePlaceholder: "https://mcp.example.com/mcp or @modelcontextprotocol/server-filesystem",
    sourceRequired: "Enter a server source",
    selectAgentRequired: "Select at least one agent",
    projectDirRequired: "Choose a project folder first",
    timeoutInvalid: "Timeout must be a number greater than 0",
    unknownError: "Unknown error",
    added: "Added to",
    agentsUnit: "agents",
    dropped: "Some fields are unsupported and were skipped: ",
    failed: "agents failed: ",
    addFailed: "Add failed",
    projectDir: "Project folder",
    choose: "Choose",
    projectHint: "Project install writes to the selected project's config",
    nameOptional: "Name (optional)",
    autoDetect: "Auto detect",
    scope: "Install scope",
    global: "Global",
    local: "Project",
    transport: "Transport:",
    headers: "HTTP headers (optional)",
    oauthScopes: "OAuth scopes (optional)",
    env: "Environment variables (optional)",
    args: "Extra arguments (optional)",
    timeout: "Timeout seconds (optional)",
    autoApprove: "Auto approve tools",
    autoApprovePlaceholder: "Leave empty for all tools, or separate with commas",
    targetAgents: "Target agents",
    cancel: "Cancel",
    installing: "Installing",
    install: "Install",
    parseError: "Format error",
  },
};

interface ServerFormProps {
  open: boolean;
  onClose: () => void;
  agents: AgentInfo[];
  detectedAgents?: string[];
  onSuccess?: () => void;
  initialTarget?: string;
  initialHeaders?: string;
  initialEnv?: string;
  initialArgs?: string;
}

export function ServerForm({
  open,
  onClose,
  agents,
  detectedAgents,
  onSuccess,
  initialTarget,
  initialHeaders,
  initialEnv,
  initialArgs,
}: ServerFormProps) {
  const { language } = useLanguageStore();
  const t = formText[language];
  const [target, setTarget] = useState(initialTarget ?? "");
  const [serverName, setServerName] = useState("");
  const [scope, setScope] = useState<"local" | "global">("global");
  const [projectDir, setProjectDir] = useState("");
  const [transport, setTransport] = useState<"http" | "sse">("http");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [headers, setHeaders] = useState("");
  const [env, setEnv] = useState("");
  const [args, setArgs] = useState("");
  const [timeout, setTimeoutValue] = useState("");
  const [oauthScopes, setOauthScopes] = useState("");
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);
  const [autoApproveTools, setAutoApproveTools] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialTarget !== undefined) {
      setTarget(initialTarget);
    }
    if (initialHeaders !== undefined) {
      setHeaders(initialHeaders);
    }
    if (initialEnv !== undefined) {
      setEnv(initialEnv);
    }
    if (initialArgs !== undefined) {
      setArgs(initialArgs);
    }
  }, [initialTarget, initialHeaders, initialEnv, initialArgs]);

  const isUrl = target.startsWith("http://") || target.startsWith("https://");
  const isNpm = target.startsWith("@") || (!isUrl && target.includes("/"));

  // 自动推断传输类型
  useEffect(() => {
    if (isUrl) {
      if (target.includes("/sse") || target.endsWith("/sse")) {
        setTransport("sse");
      } else {
        setTransport("http");
      }
    }
  }, [target, isUrl]);

  const chooseProjectDir = async () => {
    const selected = await openDialog({ directory: true, multiple: false });
    if (typeof selected === "string") {
      setProjectDir(selected);
    }
  };

  const handleSubmit = async () => {
    if (!target.trim()) {
      toast.error(t.sourceRequired);
      return;
    }
    if (selectedAgents.length === 0) {
      toast.error(t.selectAgentRequired);
      return;
    }
    if (scope === "local" && !projectDir.trim()) {
      toast.error(t.projectDirRequired);
      return;
    }

    setLoading(true);
    try {
      const parsedHeaders = parseKeyValueLines(headers, ":", t.parseError);
      const parsedEnv = parseKeyValueLines(env, "=", t.parseError);

      const parsedArgs = args.trim()
        ? args.split("\n").map((a) => a.trim()).filter(Boolean)
        : null;
      const parsedTimeout = timeout.trim() ? Number(timeout.trim()) : null;
      if (parsedTimeout !== null && (!Number.isFinite(parsedTimeout) || parsedTimeout <= 0)) {
        toast.error(t.timeoutInvalid);
        return;
      }

      const parsedScopes = oauthScopes.trim()
        ? oauthScopes.split(/[\n,]/).map((scope) => scope.trim()).filter(Boolean)
        : null;
      const parsedAutoApproveTools = autoApproveEnabled
        ? autoApproveTools.split(/[\n,]/).map((tool) => tool.trim()).filter(Boolean)
        : null;

      const results = await addMcpServer({
        target: target.trim(),
        serverName: serverName.trim() || undefined,
        agents: selectedAgents,
        scope,
        cwd: scope === "local" ? projectDir.trim() : null,
        transport: isUrl ? transport : undefined,
        headers: isUrl ? parsedHeaders : null,
        env: !isUrl ? parsedEnv : null,
        args: !isUrl ? parsedArgs : null,
        timeout: parsedTimeout,
        oauthScopes: parsedScopes,
        autoApproveTools: parsedAutoApproveTools,
      });

      const successCount = results.filter((r: AddServerResult) => r.success).length;
      const failCount = results.filter((r: AddServerResult) => !r.success).length;
      const dropped = results
        .filter((r: AddServerResult) => r.success && r.droppedFields.length > 0)
        .map((r: AddServerResult) => `${r.agentType}: ${r.droppedFields.join(", ")}`);
      const failures = results
        .filter((r: AddServerResult) => !r.success)
        .map((r: AddServerResult) => `${r.agentType}: ${r.error ?? t.unknownError}`);

      if (successCount > 0) {
        toast.success(`${t.added} ${successCount} ${t.agentsUnit}`);
      }
      if (dropped.length > 0) {
        toast.warning(`${t.dropped}${dropped.join(language === "zh" ? "；" : "; ")}`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} ${t.failed}${failures.join(language === "zh" ? "；" : "; ")}`);
      }

      // 重置表单
      setTarget("");
      setServerName("");
      setProjectDir("");
      setSelectedAgents([]);
      setHeaders("");
      setEnv("");
      setArgs("");
      setTimeoutValue("");
      setOauthScopes("");
      setAutoApproveEnabled(false);
      setAutoApproveTools("");
      onClose();
      onSuccess?.();
    } catch (e) {
      toast.error(`${t.addFailed}: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  // 传输类型标签
  const TypeBadge = ({ active, icon: Icon, label, onClick }: { active: boolean; icon: any; label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
        active
          ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]"
          : "bg-transparent text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--primary)]/50 hover:text-[var(--foreground)]"
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );

  const projectDirMissing = scope === "local" && !projectDir.trim();

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{t.title}</DialogTitle>
      </DialogHeader>

      <DialogContent className="space-y-4">
        {/* 第一行：Server 源输入 */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[var(--muted-foreground)]">{t.source}</Label>
          <div className="relative">
            <Input
              placeholder={t.sourcePlaceholder}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="h-9 pr-16 text-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              {isUrl && <Globe className="h-4 w-4 text-blue-500" />}
              {isNpm && <Package className="h-4 w-4 text-orange-500" />}
              {!isUrl && !isNpm && target && <Terminal className="h-4 w-4 text-green-500" />}
            </div>
          </div>
        </div>

        {scope === "local" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[var(--muted-foreground)]">{t.projectDir}</Label>
            <div className="flex gap-2">
              <Input
                value={projectDir}
                onChange={(e) => setProjectDir(e.target.value)}
                placeholder="/path/to/project"
                className="h-9 text-sm font-mono"
              />
              <Button type="button" variant="outline" size="sm" onClick={chooseProjectDir} className="h-9 shrink-0">
                <FolderOpen className="h-3.5 w-3.5" />
                {t.choose}
              </Button>
            </div>
            {projectDirMissing && (
              <div className="text-xs text-amber-600">{t.projectHint}</div>
            )}
          </div>
        )}

        {/* 第二行：名称 + 安装范围（各占50%） */}
        <div className="grid grid-cols-2 gap-3">
          {/* 名称 */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[var(--muted-foreground)]">{t.nameOptional}</Label>
            <Input
              placeholder={t.autoDetect}
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* 安装范围 */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[var(--muted-foreground)]">{t.scope}</Label>
            <div className="flex h-9 rounded-md border border-[var(--border)] p-0.5">
              <button
                onClick={() => setScope("global")}
                className={cn(
                  "flex-1 text-xs font-medium rounded-sm transition-all flex items-center justify-center",
                  scope === "global"
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {t.global}
              </button>
              <button
                onClick={() => setScope("local")}
                className={cn(
                  "flex-1 text-xs font-medium rounded-sm transition-all flex items-center justify-center",
                  scope === "local"
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {t.local}
              </button>
            </div>
          </div>
        </div>

        {/* 第三行：传输类型（仅 URL 时显示，放在名称/范围下方） */}
        {isUrl && (
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-[var(--muted-foreground)] shrink-0">{t.transport}</Label>
            <div className="flex gap-2">
              <TypeBadge
                active={transport === "http"}
                icon={Globe}
                label="HTTP"
                onClick={() => setTransport("http")}
              />
              <TypeBadge
                active={transport === "sse"}
                icon={Terminal}
                label="SSE"
                onClick={() => setTransport("sse")}
              />
            </div>
          </div>
        )}

        {/* 第四行：高级选项（直接展开） */}
        {isUrl ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[var(--muted-foreground)]">{t.headers}</Label>
              <Textarea
                placeholder={"Authorization: Bearer token\nX-Custom-Header: value"}
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                rows={2}
                className="text-xs font-mono resize-none min-h-[60px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[var(--muted-foreground)]">{t.oauthScopes}</Label>
              <Textarea
                placeholder={"repo\nread:user"}
                value={oauthScopes}
                onChange={(e) => setOauthScopes(e.target.value)}
                rows={2}
                className="text-xs font-mono resize-none min-h-[60px]"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[var(--muted-foreground)]">{t.env}</Label>
              <Textarea
                placeholder={"API_KEY=secret"}
                value={env}
                onChange={(e) => setEnv(e.target.value)}
                rows={2}
                className="text-xs font-mono resize-none min-h-[60px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[var(--muted-foreground)]">{t.args}</Label>
              <Textarea
                placeholder="--flag value"
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                rows={2}
                className="text-xs font-mono resize-none min-h-[60px]"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[var(--muted-foreground)]">{t.timeout}</Label>
            <Input
              type="number"
              min={1}
              placeholder="60"
              value={timeout}
              onChange={(e) => setTimeoutValue(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 h-9">
              <Checkbox
                checked={autoApproveEnabled}
                onClick={() => setAutoApproveEnabled((value) => !value)}
              />
              <Label className="text-xs font-medium text-[var(--muted-foreground)]">{t.autoApprove}</Label>
            </div>
            {autoApproveEnabled && (
              <Input
                placeholder={t.autoApprovePlaceholder}
                value={autoApproveTools}
                onChange={(e) => setAutoApproveTools(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            )}
          </div>
        </div>

        {/* 第五行：目标 Agent 选择 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-[var(--muted-foreground)]">
              {t.targetAgents}
              <span className="ml-1.5 text-[var(--primary)]">{selectedAgents.length}</span>
            </Label>
            {selectedAgents.length === 0 && (
              <span className="text-xs text-amber-600">{t.selectAgentRequired}</span>
            )}
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 max-h-[200px] overflow-y-auto">
            <AgentSelector
              agents={agents}
              selected={selectedAgents}
              onChange={setSelectedAgents}
              detectedAgents={detectedAgents}
            />
          </div>
        </div>
      </DialogContent>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose} className="px-5">
          {t.cancel}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !target.trim() || selectedAgents.length === 0 || projectDirMissing}
          className="px-5"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t.installing}
            </span>
          ) : (
            t.install
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function parseKeyValueLines(input: string, separator: ":" | "=", parseError: string): Record<string, string> | null {
  const lines = input.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  return Object.fromEntries(
    lines.map((line) => {
      const idx = line.indexOf(separator);
      if (idx <= 0) {
        throw new Error(`${parseError}: ${line}`);
      }

      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
  );
}
