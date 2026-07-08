// MCP Server 进程管理器
// 安全地管理多个 stdio 类型的 MCP Server 子进程
// 参考: 方案 A — 完整版进程管理

use crate::agent::types::McpServerConfig;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use sysinfo::{Pid, System};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, Command};
use tokio::sync::Mutex;

/// 日志事件载荷（通过 Tauri Event 推送到前端）
#[derive(Debug, Clone, Serialize)]
pub struct LogPayload {
    pub stream: String, // "stdout" | "stderr"
    pub line: String,
    pub timestamp: String,
}

/// 运行中 Server 的状态
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerStatus {
    pub name: String,
    pub pid: Option<u32>,
    pub uptime_secs: u64,
    pub cpu_usage: f32,
    pub memory_mb: f64,
    pub is_running: bool,
    pub status_type: String,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerProbe {
    pub name: String,
    pub config: McpServerConfig,
}

/// 受管理的子进程
struct ManagedProcess {
    child: Child,
    stdin: Option<ChildStdin>,
    started_at: std::time::Instant,
    pid: u32,
}

/// 全局进程管理器，通过 Tauri State 注入
pub struct ProcessManager {
    /// key: server_name, value: 受管理的子进程
    processes: Arc<Mutex<HashMap<String, ManagedProcess>>>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            processes: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 启动一个 stdio 类型的 MCP Server
    pub async fn start_server(
        &self,
        server_name: String,
        config: &McpServerConfig,
        app_handle: AppHandle,
    ) -> Result<u32, String> {
        let mut processes = self.processes.lock().await;

        if processes.contains_key(&server_name) {
            return Err(format!("Server '{}' is already running", server_name));
        }

        let command = config
            .command
            .as_ref()
            .ok_or("No command specified for stdio server")?;
        let args = config.args.clone().unwrap_or_default();

        let mut cmd = Command::new(command);
        cmd.args(&args);

        // 设置环境变量
        if let Some(env) = &config.env {
            for (k, v) in env {
                cmd.env(k, v);
            }
        }

        crate::runtime::apply_runtime_path_to_command(&mut cmd);

        // 捕获 stdout/stderr/stdin
        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());
        cmd.stdin(std::process::Stdio::piped());

        // 在 Windows 上隐藏控制台窗口
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let mut child = cmd.spawn().map_err(|e| {
            format!(
                "Failed to start '{}': {}. Make sure the command exists in your PATH.",
                command, e
            )
        })?;

        let pid = child.id().ok_or("Failed to get PID")?;

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();
        let stdin = child.stdin.take();

        // 启动异步任务读取 stdout，通过 Tauri Event 推送到前端
        if let Some(stdout) = stdout {
            let name = server_name.clone();
            let handle = app_handle.clone();
            tokio::spawn(async move {
                read_stream(stdout, "stdout", &name, handle).await;
            });
        }

        // 启动异步任务读取 stderr
        if let Some(stderr) = stderr {
            let name = server_name.clone();
            let handle = app_handle.clone();
            tokio::spawn(async move {
                read_stream(stderr, "stderr", &name, handle).await;
            });
        }

        processes.insert(
            server_name,
            ManagedProcess {
                child,
                stdin,
                started_at: std::time::Instant::now(),
                pid,
            },
        );

        Ok(pid)
    }

    /// 停止指定 Server
    pub async fn stop_server(&self, server_name: &str) -> Result<(), String> {
        let mut processes = self.processes.lock().await;
        if let Some(mut proc) = processes.remove(server_name) {
            // 先尝试优雅关闭（发送 SIGTERM / Windows 上 kill）
            proc.child.kill().await.map_err(|e| e.to_string())?;
            let _ = proc.child.wait().await;
        }
        Ok(())
    }

    /// 停止所有运行中的 Server
    pub async fn stop_all(&self) {
        let mut processes = self.processes.lock().await;
        for (_, mut proc) in processes.drain() {
            let _ = proc.child.kill().await;
            let _ = proc.child.wait().await;
        }
    }

    /// 获取所有运行中 Server 的状态（PID + 运行时长 + 资源占用）
    pub async fn get_statuses(&self, probes: &[ServerProbe]) -> Vec<ServerStatus> {
        let mut processes = self.processes.lock().await;
        let mut sys = System::new();

        let mut statuses = Vec::new();
        let mut exited = Vec::new();
        for (name, proc) in processes.iter_mut() {
            match proc.child.try_wait() {
                Ok(Some(_)) => {
                    exited.push(name.clone());
                    continue;
                }
                Ok(None) => {}
                Err(_) => {
                    exited.push(name.clone());
                    continue;
                }
            }

            let pid = Pid::from_u32(proc.pid);
            sys.refresh_processes(sysinfo::ProcessesToUpdate::Some(&[pid]), true);

            let (cpu, memory) = if let Some(process) = sys.process(pid) {
                (process.cpu_usage(), process.memory() as f64 / 1024.0 / 1024.0)
            } else {
                (0.0, 0.0)
            };

            statuses.push(ServerStatus {
                name: name.clone(),
                pid: Some(proc.pid),
                uptime_secs: proc.started_at.elapsed().as_secs(),
                cpu_usage: cpu,
                memory_mb: memory,
                is_running: true,
                status_type: "managed".to_string(),
                detail: None,
            });
        }

        for name in exited {
            processes.remove(&name);
        }
        drop(processes);

        statuses.extend(check_remote_statuses(probes).await);
        statuses
    }

    /// 向指定 Server 的 stdin 发送 JSON-RPC 消息
    pub async fn send_jsonrpc(&self, server_name: &str, message: &str) -> Result<(), String> {
        let mut processes = self.processes.lock().await;
        let proc = processes
            .get_mut(server_name)
            .ok_or(format!("Server '{}' is not running", server_name))?;

        let stdin = proc
            .stdin
            .as_mut()
            .ok_or("No stdin available for this process")?;

        // JSON-RPC over stdio 使用 Content-Length 分隔的消息格式
        let content = format!(
            "Content-Length: {}\r\n\r\n{}",
            message.len(),
            message
        );
        stdin
            .write_all(content.as_bytes())
            .await
            .map_err(|e| format!("Failed to write to stdin: {}", e))?;
        stdin
            .flush()
            .await
            .map_err(|e| format!("Failed to flush stdin: {}", e))?;

        Ok(())
    }

    /// 检查指定 Server 是否正在运行
    #[allow(dead_code)]
    pub async fn is_running(&self, server_name: &str) -> bool {
        let processes = self.processes.lock().await;
        processes.contains_key(server_name)
    }
}

async fn check_remote_statuses(probes: &[ServerProbe]) -> Vec<ServerStatus> {
    let client = reqwest::Client::new();
    let mut seen_names = HashSet::new();
    let mut tasks = tokio::task::JoinSet::new();

    for probe in probes.iter().filter(|probe| probe.config.url.is_some()) {
        if seen_names.contains(&probe.name) {
            continue;
        }
        let Some(url) = probe.config.url.as_ref() else {
            continue;
        };

        let name = probe.name.clone();
        let url = url.clone();
        let client = client.clone();
        tasks.spawn(async move {
            let result = tokio::time::timeout(
                std::time::Duration::from_secs(2),
                client.get(&url).send(),
            )
            .await;

            let (is_running, detail) = match result {
                Ok(Ok(response)) => (
                    true,
                    Some(format!("HTTP {}", response.status().as_u16())),
                ),
                Ok(Err(error)) => (false, Some(error.to_string())),
                Err(_) => (false, Some("request timed out".to_string())),
            };

            ServerStatus {
                name,
                pid: None,
                uptime_secs: 0,
                cpu_usage: 0.0,
                memory_mb: 0.0,
                is_running,
                status_type: "remote".to_string(),
                detail,
            }
        });
        seen_names.insert(probe.name.clone());
    }

    let mut statuses = Vec::new();
    while let Some(result) = tasks.join_next().await {
        if let Ok(status) = result {
            statuses.push(status);
        }
    }

    statuses
}

/// 异步读取子进程输出流并推送 Tauri Event
async fn read_stream<R: tokio::io::AsyncRead + Unpin>(
    stream: R,
    stream_name: &str,
    server_name: &str,
    app_handle: AppHandle,
) {
    let mut reader = BufReader::new(stream);
    let mut buf = String::new();

    loop {
        buf.clear();
        match reader.read_line(&mut buf).await {
            Ok(0) => break, // EOF
            Ok(_) => {
                let line = buf.trim_end().to_string();
                let payload = LogPayload {
                    stream: stream_name.to_string(),
                    line,
                    timestamp: Utc::now().to_rfc3339(),
                };
                let event_name = format!("mcp-log-{}", server_name);
                let _ = app_handle.emit(&event_name, &payload);
            }
            Err(_) => break,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn remote_checks_complete_concurrently() {
        let probes = vec![
            ServerProbe {
                name: "remote-a".to_string(),
                config: McpServerConfig {
                    url: Some("http://127.0.0.1:9/a".to_string()),
                    ..Default::default()
                },
            },
            ServerProbe {
                name: "remote-b".to_string(),
                config: McpServerConfig {
                    url: Some("http://127.0.0.1:9/b".to_string()),
                    ..Default::default()
                },
            },
        ];

        let statuses = check_remote_statuses(&probes).await;

        assert_eq!(statuses.len(), 2);
        assert!(statuses.iter().all(|status| status.status_type == "remote"));
    }

    #[tokio::test]
    async fn stdio_probes_do_not_report_external_processes() {
        let mut child = std::process::Command::new("sleep")
            .arg("2")
            .spawn()
            .expect("spawn sleep");
        let manager = ProcessManager::new();
        let probes = vec![ServerProbe {
            name: "sleep-debug".to_string(),
            config: McpServerConfig {
                command: Some("sleep".to_string()),
                args: Some(vec!["2".to_string()]),
                ..Default::default()
            },
        }];

        let statuses = manager.get_statuses(&probes).await;

        let _ = child.kill();
        let _ = child.wait();
        assert!(statuses.is_empty());
    }
}
