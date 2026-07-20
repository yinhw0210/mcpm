import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const brandFiles = [
  "package.json",
  "index.html",
  "README.md",
  "README.zh-CN.md",
  "docs/architecture.md",
  "docs/supported-agents.md",
  "CHANGELOG.md",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  "src-tauri/Cargo.toml",
  "src-tauri/tauri.conf.json",
  "src-tauri/capabilities/default.json",
  "src-tauri/src/lib.rs",
  "src-tauri/src/tray.rs",
  "src/stores/languageStore.ts",
  "src/pages/ServerDetail.tsx",
  "src/components/layout/Sidebar.tsx",
  "src/components/layout/TitleBar.tsx",
  "docs/assets/hero.svg",
  "docs/assets/screenshot-dashboard.svg",
  "docs/assets/screenshot-manager.svg",
  "docs/assets/screenshot-registry.svg",
  "docs/assets/screenshot-debug.svg",
];

const oldBrandPatterns = [
  /MCP Manager/g,
  /mcp-manager/g,
  /mcp_manager/g,
  /服务管理器/g,
];

const i18nFiles = [
  "src/pages/Dashboard.tsx",
  "src/pages/ConfigManager.tsx",
  "src/pages/RegistrySearch.tsx",
  "src/pages/ServerDetail.tsx",
  "src/pages/Settings.tsx",
  "src/components/server/ServerCard.tsx",
  "src/components/layout/TitleBar.tsx",
];

const versionFiles = [
  "src/pages/Settings.tsx",
  "src/pages/ServerDetail.tsx",
];

let failed = false;

for (const relative of brandFiles) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  for (const pattern of oldBrandPatterns) {
    const matches = source.match(pattern);
    if (matches) {
      failed = true;
      console.error(`${relative}: contains old brand pattern ${pattern}`);
    }
  }
}

for (const relative of i18nFiles) {
  const file = path.join(root, relative);
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes("useLanguageStore")) {
    failed = true;
    console.error(`${relative}: missing useLanguageStore`);
  }
}

const tauriConfig = JSON.parse(
  fs.readFileSync(path.join(root, "src-tauri/tauri.conf.json"), "utf8"),
);
const cargoManifest = fs.readFileSync(path.join(root, "src-tauri/Cargo.toml"), "utf8");
const cargoLock = fs.readFileSync(path.join(root, "src-tauri/Cargo.lock"), "utf8");
const cargoVersion = cargoManifest.match(/^version = "([^"]+)"/m)?.[1];
const cargoLockVersion = cargoLock.match(
  /\[\[package\]\]\r?\nname = "mcpm"\r?\nversion = "([^"]+)"/,
)?.[1];

for (const [source, version] of Object.entries({
  "src-tauri/tauri.conf.json": tauriConfig.version,
  "src-tauri/Cargo.toml": cargoVersion,
  "src-tauri/Cargo.lock": cargoLockVersion,
})) {
  if (version !== packageJson.version) {
    failed = true;
    console.error(`${source}: expected version ${packageJson.version}, found ${version ?? "none"}`);
  }
}

const semanticVersionPattern = /\bv?(\d+\.\d+\.\d+)\b/g;
for (const relative of versionFiles) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  for (const match of source.matchAll(semanticVersionPattern)) {
    if (match[1] !== packageJson.version) {
      failed = true;
      console.error(
        `${relative}: contains stale app version ${match[0]}; use the shared APP_VERSION`,
      );
    }
  }
}

const releaseNote = path.join(root, `docs/releases/v${packageJson.version}.md`);
if (!fs.existsSync(releaseNote)) {
  failed = true;
  console.error(`missing release note docs/releases/v${packageJson.version}.md`);
}

const agentDefinitions = fs.readFileSync(
  path.join(root, "src-tauri/src/agent/definitions.rs"),
  "utf8",
);
const agentCount = [...agentDefinitions.matchAll(/\bagent_type:\s*AgentType::/g)].length;
const branding = fs.readFileSync(path.join(root, "src/lib/branding.ts"), "utf8");
const declaredAgentCount = Number(
  branding.match(/SUPPORTED_AGENT_COUNT\s*=\s*(\d+)/)?.[1],
);

if (declaredAgentCount !== agentCount) {
  failed = true;
  console.error(
    `src/lib/branding.ts: expected SUPPORTED_AGENT_COUNT ${agentCount}, found ${declaredAgentCount || "none"}`,
  );
}

for (const [relative, expectedText] of [
  ["README.md", `supports ${agentCount} agent targets`],
  ["README.zh-CN.md", `支持 ${agentCount} 个智能体目标`],
]) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  if (!source.includes(expectedText)) {
    failed = true;
    console.error(`${relative}: expected agent count text "${expectedText}"`);
  }
}

if (failed) {
  process.exit(1);
}

console.log("Brand and i18n checks passed.");
