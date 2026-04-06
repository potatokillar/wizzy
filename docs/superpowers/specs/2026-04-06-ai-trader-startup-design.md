# AI Trader Startup Design

## Purpose

This document defines the MVP startup sequence so application boot, state restoration, and future interface launch happen in a deterministic order.

It exists because the container is now substantive enough that startup behavior should not be improvised inside `main.ts`.

## Scope

This detailed design covers:

- startup sequencing
- service readiness
- degraded-start behavior
- shutdown expectations

This document does not define:

- full TUI rendering
- background scheduler internals
- final OKX connection management

## Startup Principle

Startup should favor predictable local readiness over aggressive concurrency.

Rules:

- configuration and persistence boot must succeed before runtime services start
- runtime restoration must happen before autonomous behavior starts
- the interface should start only after core services are ready
- exchange connectivity may be degraded without blocking local startup in MVP

## Startup Sequence

MVP startup should run in this order:

1. load config
2. bootstrap database and migrations
3. build the service container
4. restore durable local runtime state
5. initialize trading-state provider / watchers
6. mark app ready
7. start interface entrypoint

The interface may display degraded connectivity after step 7, but the app should not render before the container is ready.

## Core Ready Services

These services must be ready before the app is considered started:

- config loader
- database
- audit repository
- session context
- execution workflow
- chat orchestrator
- review service
- trading-state provider

## Degraded Services

These services may start in degraded mode without blocking local boot:

- exchange connectivity
- live market-data streaming
- position/order synchronization beyond last local snapshot

MVP rule:

- degraded exchange connectivity should still allow read-only local startup and local review flows
- auto-execution should remain blocked until required live dependencies are available

## Readiness Model

Suggested startup result shape:

- `started: boolean`
- `ready: boolean`
- `degraded: boolean`
- `warnings: string[]`
- `app: AppContainer`

`ready` means core local services are usable.

`degraded` means the app started, but one or more optional runtime dependencies are not yet healthy.

## Failure Policy

### Hard failures

Startup must fail immediately when:

- config cannot be loaded or validated
- database cannot be opened or migrated
- the core container cannot be built

### Soft failures

Startup may continue in degraded mode when:

- exchange connection is offline
- market-data watcher initialization fails
- trading-state provider cannot obtain fresh remote state but can return an empty or cached local snapshot

## State Restoration

MVP restoration should initially cover:

- durable audit history availability
- session default-account loading
- persisted runtime flags when added later

Strategy/task runtime resume may remain a later startup phase, but the sequence must reserve a step for it.

## Interface Start

The startup path should not assume a TUI is always launched.

Recommended separation:

- `buildApp()` creates services
- `startApp()` performs startup sequencing and returns startup state
- a future `renderApp()` or TUI entrypoint consumes the started app

This keeps startup testable without requiring Ink to be present in every startup test.

## Shutdown Expectations

MVP shutdown should:

- stop background watchers when they exist
- avoid losing audit writes that already completed
- leave SQLite in a clean state by allowing process exit after synchronous local writes

Full graceful shutdown orchestration can remain minimal until schedulers and WebSockets are introduced.

## Immediate Implementation Guidance

The next implementation steps should be:

1. add `startApp()` to `main.ts`
2. return explicit startup status information
3. keep startup synchronous or near-synchronous for now
4. delay TUI boot until after `startApp()` reports ready

## Trigger To Pause Development Again

Pause for another design pass if startup needs:

- concurrent phased initialization with dependency graphs
- multiple interface entrypoints with different readiness needs
- complex retry/backoff policies for exchange connectivity
