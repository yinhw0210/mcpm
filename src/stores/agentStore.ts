// Agent Store: 管理所有 Agent 及其已安装 Server 列表

import { create } from "zustand";
import { fetchAllAgents, fetchAgentsWithServers } from "@/lib/tauri";
import type { AgentInfo, AgentWithServers, Scope } from "@/lib/types";

interface AgentStore {
  agents: AgentInfo[];
  agentsWithServers: AgentWithServers[];
  loading: boolean;
  error: string | null;

  fetchAgents: () => Promise<void>;
  fetchAgentsWithServers: (scope?: Scope, cwd?: string) => Promise<void>;
  clear: () => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: [],
  agentsWithServers: [],
  loading: false,
  error: null,

  fetchAgents: async () => {
    try {
      set({ loading: true, error: null });
      const agents = await fetchAllAgents();
      set({ agents, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchAgentsWithServers: async (scope?, cwd?) => {
    try {
      set({ loading: true, error: null });
      const agentsWithServers = await fetchAgentsWithServers(scope, cwd);
      set({ agentsWithServers, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  clear: () => set({ agents: [], agentsWithServers: [], error: null }),
}));
