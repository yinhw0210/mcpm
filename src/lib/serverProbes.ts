import type { InstalledServer, McpServerConfig, ServerProbe } from "./types";

export function normalizeServerConfig(config: Record<string, unknown>): McpServerConfig {
  const type = config.type === "sse" ? "sse" : config.url || config.uri || config.serverUrl ? "http" : undefined;
  const url = stringValue(config.url) ?? stringValue(config.uri) ?? stringValue(config.serverUrl);

  return {
    type,
    url,
    headers: stringRecord(config.headers) ?? stringRecord(config.http_headers),
    command: stringValue(config.command) ?? stringValue(config.cmd),
    args: stringArray(config.args),
    env: stringRecord(config.env) ?? stringRecord(config.envs) ?? stringRecord(config.environment),
    timeout: numberValue(config.timeout),
    oauthScopes: stringArray(config.oauthScopes) ?? stringArray(config.scopes),
    autoApproveTools: stringArray(config.autoApproveTools),
  };
}

export function buildServerProbe(server: InstalledServer): ServerProbe {
  return {
    name: server.serverName,
    config: normalizeServerConfig(server.config),
  };
}

export function uniqueInstalledServers(
  servers: { server: InstalledServer; agentType: string }[],
): { server: InstalledServer; agentType: string }[] {
  const seen = new Set<string>();
  const unique: { server: InstalledServer; agentType: string }[] = [];

  for (const item of servers) {
    const key = item.server.identity || item.server.serverName;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

export function buildServerProbes(servers: { server: InstalledServer }[]): ServerProbe[] {
  return uniqueInstalledServers(
    servers.map((item) => ({ ...item, agentType: item.server.agentType })),
  ).map(({ server }) => buildServerProbe(server));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value.filter((item): item is string => typeof item === "string");
  return result.length > 0 ? result : [];
}

function stringRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
