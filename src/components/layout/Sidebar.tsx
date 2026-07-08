// 侧边导航栏 — 图标 + 文字标签

import { NavLink } from "react-router-dom";
import { Languages, LayoutDashboard, Settings2, Search, Network } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/stores/languageStore";
import { APP_NAME } from "@/lib/branding";

const labels = {
  zh: {
    brand: APP_NAME,
    dashboard: "看板",
    mcp: "MCP 管理",
    registry: "注册表搜索",
    settings: "设置",
    language: "中文",
    languageTitle: "切换语言",
  },
  en: {
    brand: APP_NAME,
    dashboard: "Dashboard",
    mcp: "MCP Management",
    registry: "Registry Search",
    settings: "Settings",
    language: "EN",
    languageTitle: "Switch language",
  },
};

export function Sidebar() {
  const { language, toggleLanguage } = useLanguageStore();
  const t = labels[language];
  const navItems = [
    { to: "/", icon: LayoutDashboard, label: t.dashboard },
    { to: "/mcp", icon: Network, label: t.mcp },
    { to: "/registry", icon: Search, label: t.registry },
    { to: "/settings", icon: Settings2, label: t.settings },
  ];

  return (
    <aside className="flex w-48 flex-col border-r border-[var(--border)] bg-[var(--card)] py-4 shrink-0">
      {/* Logo */}
      <div className="mb-6 flex items-center gap-2.5 px-4">
        <img
          src="/agents/mcpm.png"
          alt={t.brand}
          className="h-8 w-8 shrink-0 rounded-lg object-contain"
        />
        <span className="text-sm font-bold">{t.brand}</span>
      </div>

      {/* 导航项 */}
      <nav className="flex flex-1 flex-col gap-1 px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-2">
        <button
          onClick={toggleLanguage}
          title={t.languageTitle}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
        >
          <Languages className="h-4 w-4 shrink-0" />
          <span className="truncate">{t.language}</span>
        </button>
      </div>
    </aside>
  );
}
