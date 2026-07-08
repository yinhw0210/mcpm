// 主应用组件：路由 + 布局

import { HashRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dashboard } from "@/pages/Dashboard";
import { ConfigManager } from "@/pages/ConfigManager";
import { McpManager } from "@/pages/McpManager";
import { ServerDetail } from "@/pages/ServerDetail";
import { RegistrySearch } from "@/pages/RegistrySearch";
import { Settings } from "@/pages/Settings";

function App() {
  return (
    <HashRouter>
      <div className="flex h-screen">
        {/* 主体内容区 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 侧边导航 */}
          <Sidebar />

          {/* 路由出口 */}
          <main className="flex-1 flex flex-col overflow-hidden">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/config" element={<ConfigManager />} />
              <Route path="/mcp" element={<McpManager />} />
              <Route path="/server/:name" element={<ServerDetail />} />
              <Route path="/registry" element={<RegistrySearch />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>

      {/* Toast 通知 */}
      <Toaster position="bottom-right" richColors />
    </HashRouter>
  );
}

export default App;
