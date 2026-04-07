# Wizzy

![Wizzy Logo](assets/brand/logo-horizontal.svg)

> AI-powered crypto trading terminal for OKX

[中文](#中文) | [English](#english)

## 中文

Wizzy 是一个本地优先、终端原生的 AI 加密交易助手。它的目标不是简单聊天，而是像一个专业 duty trader 一样工作：监控市场、解释交易意图、在需要时要求确认、在权限范围内执行动作，并持续产出报告、跟踪记录和事后复盘。

### 功能特性

- 自然语言聊天作为主要控制界面
- `Reminder mode` 仅建议，不自动执行
- `Duty trader mode` 在限制范围内自动执行
- 支持 OKX 现货与永续合约
- 支持长时间运行策略与临时监控任务
- 每次判断和动作都保留结构化审计记录
- 当前已接入一个以 transcript 为中心的最小可用 TUI

### 当前 MVP 范围

当前仓库已经包含：

- 基于 schema 校验的本地配置加载
- 启动容器与启动阶段编排
- 面向核心交易请求的确定性聊天解析
- 包含风控、权限、审计和复盘叙述的执行流程
- 基于 SQLite 的审计持久化
- 一个支持启动状态、消息渲染和聊天提交的最小 Ink TUI

### 目录结构

- `docs/`：规格、计划、架构设计文档
- `app/`：源码、测试、构建配置和运行时代码
- `assets/`：品牌资源、图标和后续站点 / 应用静态素材

### 环境准备

要求：

- Node.js 22+
- `corepack`

安装依赖：

```bash
cd app
corepack pnpm install
```

可选：安装仓库本地 hook，用于约束文档同步：

```bash
bash scripts/setup-githooks.sh
```

### 使用方式

启动当前终端应用：

```bash
cd app
corepack pnpm dev
```

运行测试：

```bash
cd app
corepack pnpm test
```

运行类型检查构建：

```bash
cd app
corepack pnpm build
```

### 当前最小 TUI 能力

当前 TUI 设计是刻意收敛的，核心就是一个 transcript 视图。

已支持：

- 启动状态展示
- 当前账户和运行模式展示
- 聊天输入
- 澄清类回复
- 需要确认的回复
- 执行结果展示
- 通过 `review proposal <proposal_id>` 查看复盘结果

示例输入：

- `open btc perp long $100`
- `open btc perp long $100 limit at 81200 sl 80500 tp 83000`
- `cancel btc perp 81200 bid limit`
- `review proposal proposal-1`

### 文档

- [设计规格](docs/superpowers/specs/2026-03-26-ai-trader-terminal-design.md)
- [MVP 计划](docs/superpowers/plans/2026-03-26-ai-trader-terminal-mvp.md)
- [最小 TUI 设计](docs/superpowers/specs/2026-04-06-ai-trader-minimal-tui-design.md)
- [品牌资源说明](assets/brand/README.md)
- `app/` 下的代码改动必须同步更新 `docs/` 中对应文档
- 可通过 `bash scripts/setup-githooks.sh` 安装本地文档同步 hook

### Logo 资产约定

项目当前选定的 logo 方向为：

- 一个简洁的黑白符号 + `Wizzy` 字标组合
- 符号强调抽象的上行动势和专业工具气质
- 优先使用干净的矢量稿，不直接使用带水印的生成图

品牌资源统一放在 `assets/brand/` 下，命名规范和导出要求见 [品牌资源说明](assets/brand/README.md)。

### 当前状态

项目仍处于早期开发阶段，但本地执行 / 复盘容器和最小 TUI 已经接通。

## English

Wizzy is a local-first, terminal-native AI trading assistant for crypto workflows. It is intended to behave like a professional duty trader: monitor markets, explain trade intent, request confirmation when needed, execute within account permissions when allowed, and continuously report, track, and review its own actions.

### Features

- Natural language chat as the main control surface
- `Reminder mode` for suggestion-only workflows
- `Duty trader mode` for bounded auto-execution
- OKX spot and perpetual futures support
- Long-running strategies and ad-hoc monitoring tasks
- Structured audit history for every decision and action
- A minimal transcript-driven TUI connected to the current app container

### Current MVP Slice

The repository currently includes:

- schema-validated local config loading
- startup container and startup sequencing
- deterministic chat parsing for core trade requests
- execution workflow with risk checks, permissions, audit, and review narrative support
- SQLite-backed audit persistence
- a minimal Ink TUI for startup status, transcript rendering, and chat submission

### Repository Structure

- `docs/` - specifications, plans, and architecture documents
- `app/` - source code, tests, build configuration, and runtime assets
- `assets/` - brand assets, icons, and future static assets for web/app surfaces

### Setup

Requirements:

- Node.js 22+
- `corepack`

Install dependencies:

```bash
cd app
corepack pnpm install
```

Optional: install the local repository hook for docs-sync enforcement:

```bash
bash scripts/setup-githooks.sh
```

### Usage

Start the current terminal app:

```bash
cd app
corepack pnpm dev
```

Run tests:

```bash
cd app
corepack pnpm test
```

Run the type-check build:

```bash
cd app
corepack pnpm build
```

### Minimal TUI Behavior

The current TUI is intentionally narrow and centered around a single transcript view.

Supported today:

- startup status display
- active account and mode display
- chat input
- clarification responses
- confirmation-required responses
- execution results
- review output via `review proposal <proposal_id>`

Example prompts:

- `open btc perp long $100`
- `open btc perp long $100 limit at 81200 sl 80500 tp 83000`
- `cancel btc perp 81200 bid limit`
- `review proposal proposal-1`

### Documentation

- [Design Spec](docs/superpowers/specs/2026-03-26-ai-trader-terminal-design.md)
- [MVP Plan](docs/superpowers/plans/2026-03-26-ai-trader-terminal-mvp.md)
- [Minimal TUI Design](docs/superpowers/specs/2026-04-06-ai-trader-minimal-tui-design.md)
- [Brand Asset Guide](assets/brand/README.md)
- Code changes under `app/` must ship with matching updates under `docs/`
- Install the local docs-sync hook with `bash scripts/setup-githooks.sh`

### Logo Asset Convention

The currently selected logo direction is:

- a minimal black-and-white symbol paired with the `Wizzy` wordmark
- an abstract upward motion that still feels like a serious trading tool
- clean vector exports only for production use, not watermarked generated previews

All brand assets should live under `assets/brand/`. Naming rules and export expectations are documented in the [Brand Asset Guide](assets/brand/README.md).

### Status

Early development, but the local execution/review container and minimal TUI are already in place.
