# Wizzy

![Wizzy Logo](assets/brand/logo-horizontal.svg)

> AI-powered crypto trading terminal for OKX

[中文文档](README.zh-CN.md)

Wizzy is a local-first, terminal-native AI trading assistant for crypto workflows. It is intended to behave like a professional duty trader: monitor markets, explain trade intent, request confirmation when needed, execute within account permissions when allowed, and continuously report, track, and review its own actions.

## Features

- Natural language chat as the main control surface
- `Reminder mode` for suggestion-only workflows
- `Duty trader mode` for bounded auto-execution
- OKX spot and perpetual futures support
- Long-running strategies and ad-hoc monitoring tasks
- Structured audit history for every decision and action
- A minimal transcript-driven TUI connected to the current app container

## Current MVP Slice

The repository currently includes:

- schema-validated local config loading
- startup container and startup sequencing
- deterministic chat parsing for core trade requests
- execution workflow with risk checks, permissions, audit, and review narrative support
- SQLite-backed audit persistence
- a minimal Ink TUI for startup status, transcript rendering, and chat submission

## Repository Structure

- `docs/` - specifications, plans, and architecture documents
- `app/` - source code, tests, build configuration, and runtime assets
- `assets/` - brand assets, icons, and future static assets for web/app surfaces

## Setup

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

## Usage

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

## Minimal TUI Behavior

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

## Documentation

- [Design Spec](docs/superpowers/specs/2026-03-26-ai-trader-terminal-design.md)
- [MVP Plan](docs/superpowers/plans/2026-03-26-ai-trader-terminal-mvp.md)
- [Minimal TUI Design](docs/superpowers/specs/2026-04-06-ai-trader-minimal-tui-design.md)
- [Brand Asset Guide](assets/brand/README.md)
- Code changes under `app/` must ship with matching updates under `docs/`
- Install the local docs-sync hook with `bash scripts/setup-githooks.sh`

## Logo Asset Convention

The currently selected logo direction is:

- a minimal black-and-white symbol paired with the `Wizzy` wordmark
- an abstract upward motion that still feels like a serious trading tool
- clean vector exports only for production use, not watermarked generated previews

All brand assets should live under `assets/brand/`. Naming rules and export expectations are documented in the [Brand Asset Guide](assets/brand/README.md).

## Status

Early development, but the local execution/review container and minimal TUI are already in place.
