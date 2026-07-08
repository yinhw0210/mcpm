import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
// @tauri-apps/cli 升级后 vite.config.ts 需使用相地路径而非 `path.resolve(__dirname, ...)`
// 参考: https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    // Tauri 前端开发服务器配置
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        host: "0.0.0.0",
        hmr: {
            protocol: "ws",
            host: "localhost",
            port: 1421,
        },
        watch: {
            ignored: ["**/src-tauri/**"],
        },
    },
});
