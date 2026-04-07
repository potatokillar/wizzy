# Wizzy App

![Wizzy Logo](../assets/brand/logo-horizontal.svg)

Application code for [Wizzy](../README.md) — an AI-powered crypto trading terminal for OKX.

## Scope

- Source code
- Tests
- Build configuration
- Local runtime assets

Design and planning docs live in the parent repository.

## Install

```bash
corepack pnpm install
```

## Commands

Start the current terminal app:

```bash
corepack pnpm dev
```

Run tests:

```bash
corepack pnpm test
```

Run the type-check build:

```bash
corepack pnpm build
```

## Current App Modules

- `src/application/` — chat, execution, review, session, runtime state boundaries
- `src/domain/` — core trading, account, audit, and risk models
- `src/infrastructure/` — persistence and in-memory runtime providers
- `src/interface/tui/` — minimal Ink terminal UI
- `tests/` — focused behavior tests for the current MVP slice
