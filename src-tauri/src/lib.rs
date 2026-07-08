// MCPM — Tauri 后端入口
// 负责插件注册、命令注册、系统托盘、进程管理状态注入

mod agent;
mod commands;
mod format;
mod process;
mod registry;
mod runtime;
mod source;
mod tray;

use process::ProcessManager;
use std::sync::Arc;
use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(Arc::new(ProcessManager::new()))
        .setup(|app| {
            // 初始化系统托盘
            tray::setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // 关闭窗口时最小化到托盘而非退出
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Agent 相关
            commands::agent::get_agents_with_servers,
            commands::agent::list_all_agents,
            // Server 配置管理
            commands::server::add_mcp_server,
            commands::server::remove_mcp_server,
            commands::server::sync_servers,
            // 进程管理
            commands::process::start_server_process,
            commands::process::stop_server_process,
            commands::process::get_server_statuses,
            commands::process::send_jsonrpc,
            // Registry 搜索
            commands::registry::search_mcp_registry,
            // 环境检测
            commands::config::detect_runtimes,
            commands::config::get_config_preview,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
