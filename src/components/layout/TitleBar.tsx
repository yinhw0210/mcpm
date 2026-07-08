// 自定义标题栏

import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import { APP_NAME } from "@/lib/branding";
import { useLanguageStore } from "@/stores/languageStore";

const labels = {
  zh: {
    minimize: "最小化",
    maximize: "最大化",
    hide: "隐藏窗口",
  },
  en: {
    minimize: "Minimize",
    maximize: "Maximize",
    hide: "Hide window",
  },
};

export function TitleBar() {
  const appWindow = getCurrentWindow();
  const { language } = useLanguageStore();
  const t = labels[language];

  return (
    <div
      className="flex h-9 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] select-none"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 px-3">
        <span className="text-xs font-medium text-[var(--muted-foreground)]">
          {APP_NAME}
        </span>
      </div>
      <div className="flex" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <button
          onClick={() => appWindow.minimize()}
          title={t.minimize}
          className="flex h-9 w-11 items-center justify-center hover:bg-[var(--accent)] cursor-pointer"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          title={t.maximize}
          className="flex h-9 w-11 items-center justify-center hover:bg-[var(--accent)] cursor-pointer"
        >
          <Square className="h-3 w-3" />
        </button>
        <button
          onClick={() => appWindow.hide()}
          title={t.hide}
          className="flex h-9 w-11 items-center justify-center hover:bg-red-500 hover:text-white cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
