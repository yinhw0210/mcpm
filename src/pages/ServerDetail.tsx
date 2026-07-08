// Server 详情页 — 日志与调试面板 — Minimal Tool 风格 (A2 Design)

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Play, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InstalledServer, ServerStatus } from "@/lib/types";
import { useLogStream } from "@/hooks/useLogStream";
import { useServerProcessStore } from "@/stores/serverStore";
import { useAgentStore } from "@/stores/agentStore";
import { startServerProcess, stopServerProcess, sendJsonRpc } from "@/lib/tauri";
import { buildServerProbe, normalizeServerConfig } from "@/lib/serverProbes";
import { toast } from "sonner";
import { useLanguageStore } from "@/stores/languageStore";
import { APP_ID } from "@/lib/branding";

const text = {
  zh: {
    remoteNoDebug: "远程 Server 不需要调试启动",
    debugStarted: "调试会话已启动",
    debugStartFailed: (error: unknown) => `调试启动失败: ${error}`,
    debugStopped: "调试会话已停止",
    stopFailed: (error: unknown) => `停止失败: ${error}`,
    rpcSent: "JSON-RPC 消息已发送",
    sendFailed: (error: unknown) => `发送失败: ${error}`,
    debugging: "调试中",
    remoteReachable: "远程可访问",
    remoteUnreachable: "远程不可达",
    stopped: "已停止",
    startDebug: "调试启动",
    stopDebug: "停止调试",
    liveLogs: "实时日志",
    clear: "清除",
    waitingOutput: "等待输出...",
    startHint: "调试启动 stdio Server 后会显示实时日志",
    rpcPanel: "JSON-RPC 交互",
    fillTemplate: "填入模板",
    send: "Send",
    shortcutHint: "Cmd+Enter 快捷发送 · 仅调试启动的 stdio Server 支持",
  },
  en: {
    remoteNoDebug: "Remote servers do not need a debug launch",
    debugStarted: "Debug session started",
    debugStartFailed: (error: unknown) => `Debug launch failed: ${error}`,
    debugStopped: "Debug session stopped",
    stopFailed: (error: unknown) => `Stop failed: ${error}`,
    rpcSent: "JSON-RPC message sent",
    sendFailed: (error: unknown) => `Send failed: ${error}`,
    debugging: "Debugging",
    remoteReachable: "Remote reachable",
    remoteUnreachable: "Remote unreachable",
    stopped: "Stopped",
    startDebug: "Start debug",
    stopDebug: "Stop debug",
    liveLogs: "Live logs",
    clear: "Clear",
    waitingOutput: "Waiting for output...",
    startHint: "Start a stdio debug session to see live logs",
    rpcPanel: "JSON-RPC",
    fillTemplate: "Use template",
    send: "Send",
    shortcutHint: "Cmd+Enter to send · only managed stdio debug sessions are supported",
  },
};

export function ServerDetail() {
  const { name } = useParams<{ name: string }>();
  const serverName = name ? decodeURIComponent(name) : null;

  const { logs, clearLogs } = useLogStream(serverName);
  const { statuses, refreshStatuses } = useServerProcessStore();
  const { agentsWithServers, fetchAgentsWithServers } = useAgentStore();
  const { language } = useLanguageStore();
  const t = text[language];
  const [status, setStatus] = useState<ServerStatus | undefined>();
  const [rpcInput, setRpcInput] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  const installedServer = useMemo<InstalledServer | undefined>(() => {
    if (!serverName) return undefined;

    for (const agent of agentsWithServers) {
      const found = [...agent.globalServers, ...agent.localServers].find(
        (server) => server.serverName === serverName,
      );
      if (found) return found;
    }

    return undefined;
  }, [agentsWithServers, serverName]);

  const serverProbe = useMemo(
    () => (installedServer ? buildServerProbe(installedServer) : undefined),
    [installedServer],
  );

  const serverConfig = useMemo(
    () => (installedServer ? normalizeServerConfig(installedServer.config) : null),
    [installedServer],
  );

  useEffect(() => {
    fetchAgentsWithServers();
  }, [fetchAgentsWithServers]);

  useEffect(() => {
    refreshStatuses(serverProbe ? [serverProbe] : undefined);
  }, [refreshStatuses, serverProbe]);

  useEffect(() => {
    const found = statuses.find((s) => s.name === serverName);
    setStatus(found);
  }, [statuses, serverName]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const isRunning = status?.isRunning ?? false;
  const isManaged = status?.statusType === "managed";
  const isRemote = Boolean(serverConfig?.url) || status?.statusType === "remote";

  const handleStart = async () => {
    if (!serverName || !serverConfig) return;
    if (serverConfig.url) {
      toast.info(t.remoteNoDebug);
      return;
    }
    try {
      await startServerProcess({
        serverName,
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env,
      });
      toast.success(t.debugStarted);
      refreshStatuses(serverProbe ? [serverProbe] : undefined);
    } catch (e) {
      toast.error(t.debugStartFailed(e));
    }
  };

  const handleStop = async () => {
    if (!serverName) return;
    try {
      await stopServerProcess(serverName);
      toast.success(t.debugStopped);
      refreshStatuses(serverProbe ? [serverProbe] : undefined);
    } catch (e) {
      toast.error(t.stopFailed(e));
    }
  };

  const handleSendRpc = async () => {
    if (!serverName || !rpcInput.trim() || !isManaged) return;
    try {
      await sendJsonRpc(serverName, rpcInput.trim());
      toast.success(t.rpcSent);
      setRpcInput("");
    } catch (e) {
      toast.error(t.sendFailed(e));
    }
  };

  const handleInitRpc = () => {
    setRpcInput(JSON.stringify({
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: APP_ID, version: "0.1.0" },
      },
      id: 1,
    }, null, 2));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--background)]">
      {/* 顶部信息栏 */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0 bg-[var(--card)]">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-bold">{serverName}</h1>
          {isManaged ? (
            <div className="inline-flex items-center rounded border border-transparent bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 shrink-0">
              {t.debugging}
            </div>
          ) : status?.statusType === "remote" && isRunning ? (
            <div className="inline-flex items-center rounded border border-transparent bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 shrink-0">
              {t.remoteReachable}
            </div>
          ) : status?.statusType === "remote" ? (
            <div className="inline-flex items-center rounded border border-transparent bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-500 shrink-0">
              {t.remoteUnreachable}
            </div>
          ) : (
            <div className="inline-flex items-center rounded border border-[var(--border)] bg-transparent px-2 py-0.5 text-xs font-medium text-[var(--foreground)] shrink-0">
              {t.stopped}
            </div>
          )}
          {status && (
            <div className="font-mono text-xs text-[var(--muted-foreground)] ml-2">
              {status.statusType === "remote"
                ? status.detail
                : `PID: ${status.pid ?? "-"} | CPU: ${status.cpuUsage.toFixed(1)}% | MEM: ${status.memoryMb.toFixed(1)}MB`}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {!isRunning && !isRemote && (
            <Button variant="default" size="sm" onClick={handleStart} disabled={!serverConfig?.command}>
              <Play className="h-3.5 w-3.5 mr-1" />
              {t.startDebug}
            </Button>
          )}
          {isManaged && (
            <button
              onClick={handleStop}
              className="inline-flex h-8 items-center justify-center rounded-md bg-[var(--destructive)]/10 px-3 text-xs font-medium text-red-500 hover:bg-red-500 hover:text-white transition-colors gap-1.5"
            >
              <Square className="h-3.5 w-3.5" />
              {t.stopDebug}
            </button>
          )}
        </div>
      </div>

      {/* 日志区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between bg-[var(--secondary)]/30 px-4 py-2 border-b border-[var(--border)] shrink-0">
          <h2 className="text-sm font-semibold">{t.liveLogs}</h2>
          <button
            onClick={clearLogs}
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] px-2 py-1 rounded transition-colors cursor-pointer"
          >
            {t.clear}
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-[var(--background)] p-4 font-mono text-xs space-y-1.5">
          {logs.length === 0 ? (
            <div className="text-[var(--muted-foreground)] text-center py-8 font-sans">
              {isManaged ? t.waitingOutput : t.startHint}
            </div>
          ) : (
            logs.map((log, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${log.stream === "stderr" ? "" : ""}`}
              >
                <span className="text-[var(--muted-foreground)] shrink-0">
                  {log.timestamp.split("T")[1]?.split(".")[0]}
                </span>
                <span
                  className={`shrink-0 w-14 ${
                    log.stream === "stderr" ? "text-red-500" : "text-[var(--muted-foreground)]"
                  }`}
                >
                  [{log.stream}]
                </span>
                <span className="break-all text-[var(--foreground)] whitespace-pre-wrap">
                  {log.line}
                </span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* JSON-RPC 交互区 */}
      <div className="border-t border-[var(--border)] p-4 bg-[var(--card)] shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">{t.rpcPanel}</h3>
          <button
            onClick={handleInitRpc}
            className="text-xs text-[var(--primary)] hover:underline"
          >
            {t.fillTemplate}
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder='{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
            value={rpcInput}
            onChange={(e) => setRpcInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.metaKey && e.key === "Enter") handleSendRpc();
            }}
            className="flex-1 h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-sm font-mono shadow-sm transition-colors placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]"
          />
          <button
            onClick={handleSendRpc}
            disabled={!isManaged}
            className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--primary)] px-4 text-xs font-medium text-[var(--primary-foreground)] shadow hover:bg-[var(--primary)]/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            {t.send}
          </button>
        </div>
        <div className="mt-2 text-[10px] text-[var(--muted-foreground)] font-mono">
          {t.shortcutHint}
        </div>
      </div>
    </div>
  );
}
