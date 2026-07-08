// 进程管理模块
// 负责 MCP Server 子进程的启动、停止、监控、JSON-RPC 交互

pub mod manager;

pub use manager::{ProcessManager, ServerProbe, ServerStatus};
