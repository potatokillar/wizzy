# Wizzy

![Wizzy Logo](assets/brand/logo-horizontal.svg)

> 面向 OKX 的 AI 加密交易终端

[English](README.md)

Wizzy 是一个本地优先、终端原生的 AI 加密交易助手。它的目标不是简单聊天，而是像一个专业 duty trader 一样工作：监控市场、解释交易意图、在需要时要求确认、在权限范围内执行动作，并持续产出报告、跟踪记录和事后复盘。

## 功能特性

- 自然语言聊天作为主要控制界面
- `Reminder mode` 仅建议，不自动执行
- `Duty trader mode` 在限制范围内自动执行
- 支持 OKX 现货与永续合约
- 支持长时间运行策略与临时监控任务
- 每次判断和动作都保留结构化审计记录
- 当前已接入一个以 transcript 为中心的最小可用 TUI

## 当前 MVP 范围

当前仓库已经包含：

- 基于 schema 校验的本地配置加载
- 启动容器与启动阶段编排
- 面向核心交易请求的确定性聊天解析
- 包含风控、权限、审计和复盘叙述的执行流程
- 基于 SQLite 的审计持久化
- 一个支持启动状态、消息渲染和聊天提交的最小 Ink TUI

## 目录结构

- `docs/`：规格、计划、架构设计文档
- `app/`：源码、测试、构建配置和运行时代码
- `assets/`：品牌资源、图标和后续站点 / 应用静态素材

## 环境准备

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

## 使用方式

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

## 当前最小 TUI 能力

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

## 文档

- [设计规格](docs/superpowers/specs/2026-03-26-ai-trader-terminal-design.md)
- [MVP 计划](docs/superpowers/plans/2026-03-26-ai-trader-terminal-mvp.md)
- [最小 TUI 设计](docs/superpowers/specs/2026-04-06-ai-trader-minimal-tui-design.md)
- [品牌资源说明](assets/brand/README.md)
- `app/` 下的代码改动必须同步更新 `docs/` 中对应文档
- 可通过 `bash scripts/setup-githooks.sh` 安装本地文档同步 hook

## Logo 资产约定

项目当前选定的 logo 方向为：

- 一个简洁的黑白符号 + `Wizzy` 字标组合
- 符号强调抽象的上行动势和专业工具气质
- 优先使用干净的矢量稿，不直接使用带水印的生成图

品牌资源统一放在 `assets/brand/` 下，命名规范和导出要求见 [品牌资源说明](assets/brand/README.md)。

## 当前状态

项目仍处于早期开发阶段，但本地执行 / 复盘容器和最小 TUI 已经接通。
