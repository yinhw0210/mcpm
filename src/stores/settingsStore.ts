// Settings Store: 管理应用设置

import { create } from "zustand";
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";

interface SettingsStore {
  autoStart: boolean;
  loading: boolean;

  initAutoStart: () => Promise<void>;
  toggleAutoStart: (enabled: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  autoStart: false,
  loading: false,

  initAutoStart: async () => {
    try {
      const enabled = await isEnabled();
      set({ autoStart: enabled });
    } catch {
      // 插件可能未初始化，忽略
    }
  },

  toggleAutoStart: async (enabled) => {
    set({ loading: true });
    try {
      if (enabled) {
        await enable();
      } else {
        await disable();
      }
      set({ autoStart: enabled, loading: false });
    } catch (e) {
      console.error("Failed to toggle autostart:", e);
      set({ loading: false });
    }
  },
}));
