import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

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

if (failed) {
  process.exit(1);
}

console.log("Brand and i18n checks passed.");
