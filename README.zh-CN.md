# MCPM

**一个面向多智能体的 MCP Server 可视化控制中心。**

[English](README.md) · [架构说明](docs/architecture.md) · [支持的智能体](docs/supported-agents.md) · [贡献指南](CONTRIBUTING.md)

![MCPM 看板](docs/assets/dashboard.png)

MCP Server 很强，但配置分散在不同编辑器、CLI、桌面应用、全局文件和项目文件里。MCPM 希望把这些碎片化配置收进一个桌面应用：你可以在一个地方安装、查看、同步和调试 MCP Server，不需要记住每个智能体自己的配置格式。

## 为什么做 MCPM

只用一个 AI 编程工具时，MCP 配置还能手写。可一旦你同时使用 Cursor、Claude Code、Codex、VS Code、Zed、Goose、Kiro、OpenCode 或其他工具，配置就会开始失控：

- 每个智能体的配置文件位置不一样
- 每个智能体接受的配置字段不一样
- 有的支持 HTTP，有的支持 SSE，有的只能用 stdio
- 同一个 Server 可能在不同智能体里叫不同名字
- 项目级配置和全局配置很容易混在一起
- stdio Server 出问题时，通常只能猜它到底启动了什么

MCPM 的思路是：把 MCP Server 本身作为中心。你只需要输入一次 URL、npm 包名、命令或本地路径，然后让应用为不同智能体写入对应的原生配置。

## 你可以用它做什么

### 一次添加，写入多个智能体

从远程 URL、npm 包、命令或本地可执行文件添加 MCP Server。选择全局或项目范围，再勾选目标智能体，MCPM 会按目标格式写入 JSON、YAML 或 TOML 配置。

### 看清你的 MCP 配置关系

服务管理视图按 Server 聚合，适合看一个 Server 启用了哪些智能体。配置管理视图按智能体聚合，适合查看每个工具的全局配置和项目配置。看板会展示远程可访问状态和当前调试会话。

### 从 Registry 发现 Server

在应用里搜索 add-mcp registry 和官方 MCP registry。Registry 元数据可以预填远程地址、包名、请求头、环境变量和运行参数。

### 调试 stdio Server

你可以启动一个由 MCPM 管理的 stdio 调试会话，查看 stdout/stderr 实时日志，观察 CPU 和内存占用，并从详情页发送 JSON-RPC 消息。

## 快速开始

当前项目还处在源码优先阶段。请先安装 pnpm、Rust 和 Tauri 对应系统依赖。

```bash
pnpm install
pnpm tauri dev
```

构建桌面应用：

```bash
pnpm tauri build
```

提交前建议运行：

```bash
pnpm run typecheck
pnpm run build
cd src-tauri
cargo test
```

## 支持的智能体

当前支持 25 个智能体目标：

| 类型 | 示例 |
| --- | --- |
| 主流编程智能体 | Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot CLI、VS Code |
| 桌面端和编辑器客户端 | Claude Desktop、Cline、Goose、Kiro、OpenCode、Windsurf、Zed |
| 国内常见智能体 | CodeWhale、DeepSeek Reasonix、Kimi Code、Qoder、TRAE CN、TRAE International、WorkBuddy |
| 其他目标 | Antigravity、CatPaw、MCPorter、MiMoCode |

完整配置路径、项目级支持、传输类型和可选字段见 [docs/supported-agents.md](docs/supported-agents.md)。

## 基于 add-mcp 的二次开发

MCPM 是基于 [neon-solutions/add-mcp](https://github.com/neon-solutions/add-mcp) 思路做的桌面端二次开发。`add-mcp` 是一个优秀的命令行 MCP 配置工具，提供添加、发现、删除和同步 MCP Server 的核心工作流。

本项目继承并迁移了这些关键设计：

- 解析 URL、包名、命令和本地路径
- 按智能体声明传输类型和可选字段能力
- 将统一 MCP 配置转换为每个智能体的原生配置格式
- 从 Registry 搜索并预填安装信息
- 按稳定 Server identity 删除和同步配置

在此基础上，MCPM 增加了桌面可视化流程、中英文 UI、运行时检测、进程调试、远程状态探测和托盘行为。`add-mcp` 使用 Apache-2.0 License，本项目会在文档中明确保留这段来源关系。

## 截图

| 看板 | MCP 管理 |
| --- | --- |
| ![看板](docs/assets/dashboard.png) | ![MCP 管理](docs/assets/mcp-management.png) |

| Registry 搜索 | 设置 |
| --- | --- |
| ![Registry 搜索](docs/assets/registry-search.png) | ![设置](docs/assets/settings.png) |

## 文档

- [架构说明](docs/architecture.md)：源码解析、智能体转换、Registry 流程和进程调试
- [支持的智能体](docs/supported-agents.md)：配置路径、传输类型、项目级配置和可选字段
- [发布指南](docs/release.md)：打包、GitHub CLI 命令和 release note 维护方式
- [贡献指南](CONTRIBUTING.md)：开发环境、检查命令和 PR 要求
- [安全策略](SECURITY.md)：配置写入、命令执行和敏感信息相关问题的报告方式
- [更新日志](CHANGELOG.md)：版本记录和即将发布的变化

## 安全边界

MCPM 会写入本机智能体配置文件，也可以在调试时启动本地 stdio Server 命令。提交项目级配置前请检查生成内容，不要把密钥写入共享配置，只运行你信任的 MCP Server。

## 技术栈

MCPM 使用 Tauri 2、React 19、TypeScript、Zustand、Tailwind CSS、Rust、Tokio 和 reqwest。

## License

MCPM 使用 [MIT License](LICENSE) 开源。
