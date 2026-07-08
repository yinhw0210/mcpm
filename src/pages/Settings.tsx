// 设置页面 — Minimal Tool 风格 (A2 Design)

import { useEffect, useState } from "react";
import { Power, Terminal, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/stores/settingsStore";
import { detectRuntimes } from "@/lib/tauri";
import type { RuntimeInfo } from "@/lib/types";
import { useLanguageStore } from "@/stores/languageStore";
import { APP_NAME } from "@/lib/branding";

const text = {
  zh: {
    title: "设置",
    subtitle: "管理全局偏好与本机运行工具",
    general: "通用",
    globalStartup: "全局启动行为",
    autoStart: "开机自启",
    autoStartDesc: `随系统启动自动运行 ${APP_NAME} 服务`,
    runtimes: "本机运行工具",
    runtimeHint: "检测命令是否可用",
    checking: "检测中...",
    installed: "已安装",
    missing: "未找到",
    about: "关于",
    systemInfo: "系统信息",
    version: "版本",
    techStack: "技术栈",
    supportedAgents: "支持智能体数",
    runtimeDescriptions: {
      nodejs: "用于启动 .js 类型 stdio Server",
      npx: "用于启动 npx 方式发布的 stdio Server",
      python: "用于启动 python/pip 类型 stdio Server",
      bun: "可选的高性能 TS/JS 运行时",
      uvx: "高性能 Python 包运行工具",
    },
  },
  en: {
    title: "Settings",
    subtitle: "Manage global preferences and local runtimes",
    general: "General",
    globalStartup: "Global startup behavior",
    autoStart: "Launch at login",
    autoStartDesc: `Start ${APP_NAME} with the system`,
    runtimes: "Local runtimes",
    runtimeHint: "Check whether commands are available",
    checking: "Checking...",
    installed: "Installed",
    missing: "Missing",
    about: "About",
    systemInfo: "System information",
    version: "Version",
    techStack: "Tech stack",
    supportedAgents: "Supported agents",
    runtimeDescriptions: {
      nodejs: "Used to start .js stdio servers",
      npx: "Used to start stdio servers published for npx",
      python: "Used to start Python and pip stdio servers",
      bun: "Optional high-performance TS/JS runtime",
      uvx: "Fast Python package runner",
    },
  },
};

export function Settings() {
  const { autoStart, initAutoStart, toggleAutoStart, loading } = useSettingsStore();
  const [runtimes, setRuntimes] = useState<RuntimeInfo | null>(null);
  const { language } = useLanguageStore();
  const t = text[language];

  useEffect(() => {
    initAutoStart();
    detectRuntimes().then(setRuntimes).catch(console.error);
  }, [initAutoStart]);

  return (
    <div className="flex-1 flex flex-col overflow-auto p-6">
      <div className="max-w-2xl w-full mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {t.subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* 通用设置 */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-[var(--secondary)]/30 border-b border-[var(--border)] flex items-center gap-2">
              <Power className="h-4 w-4 text-[var(--foreground)]" />
              <span className="text-sm font-semibold">{t.general}</span>
              <span className="text-xs text-[var(--muted-foreground)] ml-auto">{t.globalStartup}</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{t.autoStart}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {t.autoStartDesc}
                </div>
              </div>
              <Switch
                checked={autoStart}
                disabled={loading}
                onCheckedChange={(checked: boolean) => toggleAutoStart(checked)}
              />
            </div>
          </div>

          {/* 本机运行工具 */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-[var(--secondary)]/30 border-b border-[var(--border)] flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[var(--foreground)]" />
              <span className="text-sm font-semibold">{t.runtimes}</span>
              <span className="text-xs text-[var(--muted-foreground)] ml-auto">{t.runtimeHint}</span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {!runtimes ? (
                <div className="p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">{t.checking}</p>
                </div>
              ) : (
                [
                  { name: "Node.js", path: runtimes.nodejs, desc: t.runtimeDescriptions.nodejs },
                  { name: "npx", path: runtimes.npx, desc: t.runtimeDescriptions.npx },
                  { name: "Python", path: runtimes.python, desc: t.runtimeDescriptions.python },
                  { name: "Bun", path: runtimes.bun, desc: t.runtimeDescriptions.bun },
                  { name: "uvx", path: runtimes.uvx, desc: t.runtimeDescriptions.uvx },
                ].map((rt) => (
                  <div key={rt.name} className="px-4 py-3 flex items-center">
                    <div className="w-24 text-sm font-medium shrink-0">{rt.name}</div>
                    {rt.path ? (
                      <div className="inline-flex items-center rounded border border-transparent bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400 shrink-0 mr-3">
                        {t.installed}
                      </div>
                    ) : (
                      <div className="inline-flex items-center rounded border border-[var(--destructive)]/30 bg-[var(--destructive)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--destructive)] shrink-0 mr-3">
                        {t.missing}
                      </div>
                    )}
                    <div className="flex-1 flex flex-col min-w-0">
                      <span className="font-mono text-xs text-[var(--muted-foreground)] truncate">
                        {rt.path ?? "-"}
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)] opacity-70">
                        {rt.desc}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 关于 */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-[var(--secondary)]/30 border-b border-[var(--border)] flex items-center gap-2">
              <Info className="h-4 w-4 text-[var(--foreground)]" />
              <span className="text-sm font-semibold">{t.about}</span>
              <span className="text-xs text-[var(--muted-foreground)] ml-auto">{t.systemInfo}</span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">{t.version}</span>
                <span className="text-sm font-mono">v0.1.0</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">{t.techStack}</span>
                <span className="text-sm font-mono">Tauri 2 + React 19 + Vite + TypeScript</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">{t.supportedAgents}</span>
                <span className="text-sm font-mono">25</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
