# AI Trader Persistence Design

## Purpose

This document defines the MVP persistence model so configuration, runtime state, and audit history remain clearly separated in `app/`.

## Storage Boundaries

MVP storage is split across file-based config and SQLite runtime state.

Implementation note:

- the first MVP implementation uses Node's built-in `node:sqlite` binding to avoid introducing an extra native dependency before the execution flow is stable

### File-based config under `app/data/config`

Use JSON config files for operator-managed definitions:

- `app.json`
- `accounts.json`
- `strategies.json`
- `ui.json`

These files are authoritative for static definitions and startup defaults.

### Secret files under `app/data/secrets`

Use local JSON files referenced by `secret_ref`.

These are not runtime history stores.

### SQLite under `app/data/db`

Use SQLite for durable operational state:

- audit history
- strategy runtime state
- task runtime state
- trading state snapshots needed by workflows
- kill-switch and runtime flags if they must survive restart

## Definition vs Runtime State

This boundary must remain strict.

### Strategy definitions

Stored in `app/data/config/strategies.json`.

Contain:

- strategy id
- name
- account binding
- parameters
- schedule
- enabled flag
- static metadata

Do not store mutable runtime fields in this file.

### Strategy runtime state

Stored in SQLite.

Contain:

- strategy id
- current status
- last evaluation time
- last outcome
- next evaluation time
- last emitted proposal id
- last restart marker

### Tasks

Tasks are runtime objects and should live in SQLite only.

Contain:

- task id
- account binding
- source text
- normalized task type
- creation time
- expiry time
- current status
- last evaluation time
- result summary

## Required Tables

MVP should start with these tables.

### `audit_events`

Purpose:

- immutable chronological decision history

Minimum columns:

- `event_id`
- `timestamp`
- `account_id`
- `account_name`
- `session_id`
- `correlation_id`
- `proposal_id`
- `source`
- `symbol`
- `market_type`
- `intent`
- `mode`
- `decision`
- `reason_code`
- `reason_human`
- `risk_snapshot_json`
- `execution_snapshot_json`
- `payload_json`

### `strategy_runtime_state`

Purpose:

- durable strategy lifecycle and restart recovery

Minimum columns:

- `strategy_id`
- `status`
- `last_evaluated_at`
- `last_outcome_json`
- `next_run_at`
- `last_proposal_id`
- `updated_at`

### `tasks`

Purpose:

- durable task state

Minimum columns:

- `task_id`
- `account_id`
- `source_text`
- `normalized_type`
- `created_at`
- `expires_at`
- `status`
- `last_evaluated_at`
- `result_summary`
- `payload_json`
- `updated_at`

### `trading_state`

Purpose:

- small durable runtime flags and workflow state

Suggested uses:

- kill-switch state by account
- last close time by account+symbol
- idempotency markers

Minimum columns:

- `state_key`
- `state_value_json`
- `updated_at`

## Serialization Rules

JSON payload columns should be used for:

- flexible snapshots that are useful for audit/review
- data whose exact shape may expand during MVP

Avoid placing core query dimensions only inside JSON.

Query-critical fields such as `account_id`, `proposal_id`, `status`, and timestamps should stay as first-class columns.

## Restart Semantics

### Strategies

On startup:

- load enabled strategy definitions from config
- load runtime state from SQLite
- resume scheduling from current time
- record a downtime-gap audit or runtime event instead of replaying missed ticks

### Tasks

On startup:

- resume active non-expired tasks
- do not resume expired tasks
- record a restart event for resumed tasks

### Kill switch and runtime guards

If kill switch is intended to survive restart, persist it in `trading_state`.

This should be decided early and documented in code comments and tests.

## Repository Responsibilities

Initial repository split:

- `AuditRepository`: append and query audit events
- `StrategyRepository`: read and write strategy runtime state only
- `TaskRepository`: create, update, and query task runtime state
- `TradingStateRepository`: runtime flags, cooldown markers, idempotency markers, and kill-switch state

Repositories should not parse config files directly.

## Migration Strategy

MVP can begin with a single `001_init.sql` migration.

Requirements:

- schema creation must be idempotent for local development
- in-memory DB support must exist for tests
- migration ownership stays in infrastructure, not in application services

## Implementation Guidance

Suggested initial file ownership in `app/`:

- `src/config/loadConfig.ts`
- `src/infrastructure/persistence/Database.ts`
- `src/infrastructure/persistence/migrations/001_init.sql`
- `src/infrastructure/persistence/AuditRepository.ts`
- `src/infrastructure/persistence/StrategyRepository.ts`
- `src/infrastructure/persistence/TaskRepository.ts`
- `src/infrastructure/persistence/TradingStateRepository.ts`

Implementation should begin with `audit_events` and minimal runtime-state tables required by the first execution slice.
