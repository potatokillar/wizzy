# Wizzy

> AI-powered crypto trading terminal for OKX

Wizzy is a local-first, terminal-native trading assistant that behaves like a professional duty trader: it monitors markets, explains trade ideas, asks for confirmation when required, executes within account permissions when allowed, and continuously reports, tracks, and reviews its own actions.

## Features

- Natural language chat as the main control surface
- Reminder mode (suggest only) and Duty trader mode (auto-execute within limits)
- OKX spot and perpetual futures support
- Long-running strategies + ad-hoc monitoring tasks
- Structured audit history for every decision
- Minimal transcript-driven TUI wired to the current app container

## Current MVP Slice

The repository currently includes:

- schema-validated local config loading
- startup container and startup sequencing
- deterministic chat parsing for core trade requests
- execution workflow with risk checks, permissions, audit, and review narrative support
- SQLite-backed audit persistence
- a minimal Ink TUI for startup status, transcript rendering, and chat submission

## Structure

- `docs/` — specifications, plans, architecture
- `app/` — source code, tests, build, runtime assets

## Setup

Requirements:

- Node.js 22+
- `corepack`

Install dependencies:

```bash
cd app
corepack pnpm install
```

Optional repository hook setup:

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

The current TUI is intentionally narrow and centered on one transcript view.

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
- Code changes under `app/` must ship with matching updates under `docs/`.
- Install the local docs-sync hook with `bash scripts/setup-githooks.sh`.

## Status

Early development, but the local execution/review container and minimal TUI are in place.
