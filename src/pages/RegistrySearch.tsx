// Registry 搜索页面 — Minimal Tool 风格 (A2 Design)

import { useEffect, useState } from "react";
import { Search, Download, ExternalLink, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServerForm } from "@/components/server/ServerForm";
import { useAgentStore } from "@/stores/agentStore";
import { searchMcpRegistry } from "@/lib/tauri";
import { toast } from "sonner";
import type { RegistryServerEntry, RegistrySearchResult } from "@/lib/types";
import { useLanguageStore } from "@/stores/languageStore";

const text = {
  zh: {
    title: "Registry 搜索",
    subtitle: "发现并安装可用的 MCP Server",
    placeholder: "搜索 MCP Server (如: postgres, github)...",
    search: "搜索",
    install: "安装",
    empty: "未找到匹配的 MCP Server",
    failedRegistries: (count: number) => `${count} 个 Registry 搜索失败`,
    searchFailed: (error: unknown) => `搜索失败: ${error}`,
    fillVariables: (variables: string) => `请在 URL 或 Headers 中填写变量：${variables}`,
  },
  en: {
    title: "Registry Search",
    subtitle: "Discover and install MCP servers",
    placeholder: "Search MCP servers, for example: postgres, github...",
    search: "Search",
    install: "Install",
    empty: "No matching MCP servers",
    failedRegistries: (count: number) => `${count} registr${count === 1 ? "y" : "ies"} failed`,
    searchFailed: (error: unknown) => `Search failed: ${error}`,
    fillVariables: (variables: string) => `Fill these variables in the URL or headers: ${variables}`,
  },
};

export function RegistrySearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RegistrySearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [presetTarget, setPresetTarget] = useState("");
  const [presetHeaders, setPresetHeaders] = useState("");
  const [presetEnv, setPresetEnv] = useState("");
  const [presetArgs, setPresetArgs] = useState("");
  const { agentsWithServers, fetchAgentsWithServers } = useAgentStore();
  const { language } = useLanguageStore();
  const t = text[language];

  useEffect(() => {
    fetchAgentsWithServers();
  }, [fetchAgentsWithServers]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const result = await searchMcpRegistry(query);
      setResults(result);
      if (result.failedRegistries.length > 0) {
        toast.warning(t.failedRegistries(result.failedRegistries.length));
      }
    } catch (e) {
      toast.error(t.searchFailed(e));
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = (entry: RegistryServerEntry) => {
    const remote = entry.remotes?.[0];
    const target = remote?.url ?? entry.package?.identifier ?? entry.name;
    setPresetTarget(target);
    setPresetHeaders(
      remote?.headers
        ?.map((header) => `${header.name}: ${header.default ?? ""}`)
        .join("\n") ?? "",
    );
    setPresetEnv(
      entry.package?.environmentVariables
        ? Object.entries(entry.package.environmentVariables)
            .map(([name, definition]) => `${name}=${definition.default ?? ""}`)
            .join("\n")
        : "",
    );
    setPresetArgs([
      ...(entry.package?.runtimeArguments ?? []),
      ...extractPackageArguments(entry.package?.packageArguments),
    ].join("\n"));
    const variables = remote?.variables ? Object.keys(remote.variables) : [];
    if (variables.length > 0) {
      toast.info(t.fillVariables(variables.join(", ")));
    }
    setFormOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {t.subtitle}
        </p>
      </div>

      {/* 搜索栏 */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder={t.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-[var(--input)] bg-[var(--background)] text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)] placeholder:text-[var(--muted-foreground)]"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading} size="sm" className="h-9 w-20 shrink-0">
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            </span>
          ) : (
            t.search
          )}
        </Button>
      </div>

      {/* 搜索结果 */}
      {results && (
        <div>
          {results.entries.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-12 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                {t.empty}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.entries.map((entry, idx) => {
                const remote = entry.remotes?.[0];
                const hasPackage = !!entry.package;
                const transportLabel = remote
                  ? remote.type === "sse" ? "sse" : "http"
                  : hasPackage
                    ? "stdio"
                    : "unknown";

                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 hover:bg-[var(--accent)] transition-colors flex flex-col gap-3 group shadow-sm"
                  >
                    {/* 标题行 */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-[var(--foreground)] truncate">
                          {entry.title ?? entry.name}
                        </h3>
                        <span className="inline-flex items-center rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] shrink-0">
                          v{entry.version}
                        </span>
                        <span className="inline-flex items-center rounded bg-[var(--secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--secondary-foreground)] shrink-0">
                          {transportLabel}
                        </span>
                      </div>
                      <button
                        onClick={() => handleInstall(entry)}
                        className="h-7 px-3 inline-flex items-center justify-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium shadow hover:bg-[var(--primary)]/90 transition-colors shrink-0"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        {t.install}
                      </button>
                    </div>

                    {/* 描述 */}
                    <div className="text-xs text-[var(--muted-foreground)] line-clamp-2">
                      {entry.description}
                    </div>

                    {/* 底部信息 */}
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] mt-auto">
                      {remote ? (
                        <a
                          href={remote.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex gap-2 items-center text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] font-mono transition-colors min-w-0"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{remote.url}</span>
                        </a>
                      ) : entry.package ? (
                        <div className="flex gap-2 items-center text-xs text-[var(--muted-foreground)] font-mono min-w-0">
                          <Package className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {entry.package.registryType}: {entry.package.identifier}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-[var(--muted-foreground)] font-mono opacity-50">
                          -
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
        detectedAgents={agentsWithServers.filter((a) => a.detected).map((a) => a.agentType)}
        onSuccess={() => fetchAgentsWithServers()}
        initialTarget={presetTarget}
        initialHeaders={presetHeaders}
        initialEnv={presetEnv}
        initialArgs={presetArgs}
      />
    </div>
  );
}

function extractPackageArguments(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
