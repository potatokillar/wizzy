# AI Trader Terminal Design

## Overview

AI Trader Terminal is a local-first, terminal-native crypto trading platform focused on an AI trading assistant workflow rather than a general-purpose agent platform. The product is designed for a single user who wants to collaborate with an AI that behaves like a professional duty trader: it monitors markets, explains trade ideas, asks for confirmation when required, executes within account permissions when allowed, and continuously reports, tracks, and reviews its own actions.

The first target market is OKX with support for both spot and perpetual futures. The system is pure TUI, uses chat as the primary interaction surface, supports both rule-based strategies and ad hoc user tasks, and uses the trading account as the primary boundary for permissions and risk.

Repository boundary for implementation:

- application code, tests, build config, and runtime assets live under `app/`
- design and planning documents live under `docs/`
- shared brand assets such as logo files live under `assets/brand/` and may be referenced by both repository-level and app-level README files
- code and documentation must be updated together when behavior or architecture changes

Detailed implementation design documents:

- `docs/superpowers/specs/2026-04-06-ai-trader-execution-domain-design.md`
- `docs/superpowers/specs/2026-04-06-ai-trader-chat-parsing-design.md`
- `docs/superpowers/specs/2026-04-06-ai-trader-minimal-tui-design.md`
- `docs/superpowers/specs/2026-04-06-ai-trader-order-selection-design.md`
- `docs/superpowers/specs/2026-04-06-ai-trader-okx-integration-design.md`
- `docs/superpowers/specs/2026-04-06-ai-trader-persistence-design.md`
- `docs/superpowers/specs/2026-04-06-ai-trader-startup-design.md`
- `docs/superpowers/specs/2026-04-06-ai-trader-tui-state-design.md`

## Product Goals

The system should let a user:

- use natural language chat as the main control surface for research, execution, monitoring, and review
- run the terminal as either a reminder-only assistant or a duty trader that can execute automatically within account permissions
- manage both long-running strategies and short-lived monitoring/execution tasks
- trade OKX spot and perpetual contracts from the same unified terminal
- inspect positions, orders, account mode, risk state, active strategies, active tasks, and audit logs from the terminal workspace
- review why a trade was or was not executed using structured audit history

## Product Positioning

This is not a generic AI operating system and not a broad multi-user quant platform in its first phase. It is a focused AI trader workstation for a single operator.

The user experience goal is:

- the user speaks in natural language
- the AI responds like a professional trader
- the AI can operate proactively
- every execution is bounded by account permissions and structured risk checks
- the terminal always makes current context legible

## High-Level Product Decisions

### Interaction style

The terminal uses an agent-workflow conversation style rather than simple command execution. The AI should behave like a trading desk operator:

1. understand the request
2. analyze market context
3. form a trade or monitoring plan
4. explain rationale and risk
5. either ask for confirmation or execute automatically based on account mode
6. continue monitoring and report outcomes

### Runtime modes

Each account supports one of two runtime modes:

- **Reminder mode**: the AI can monitor, analyze, suggest, and alert, but cannot execute new risk-increasing trades without user confirmation
- **Duty trader mode**: the AI can monitor, analyze, and automatically execute actions that fit the account’s authorization and risk envelope

Mode behavior rules for MVP:

- in reminder mode, opening a new position or increasing an existing position always requires explicit user confirmation
- in reminder mode, canceling an open order, reducing an existing position, closing a position, or updating a protective stop may auto-execute if the account permission flags allow it and the action reduces or does not increase risk
- in duty trader mode, any permitted action may auto-execute after risk checks
- emergency flatten and kill-switch actions are always allowed if initiated by the user, but never initiated autonomously by the AI in MVP

The user wants both modes supported and to choose them per account.

### Permission boundary

The account is the highest permission boundary in the MVP. This means:

- each account has its own execution mode
- each account has its own risk policy
- AI actions must always resolve against an explicit account context
- the system should never allow “global” autonomous trading detached from account scope

### Markets and exchange scope

The MVP targets:

- **Exchange**: OKX
- **Products**: spot and perpetual futures

### Quant scope

The product must support both:

- **strategy-driven workflows**: persistent rules that keep running
- **task-driven workflows**: temporary user goals expressed in natural language

### Output style

The AI should use a professional trader tone:

- conclusion first
- then rationale
- then risk
- then next action or recommendation

### Primary interface

The primary interface is a pure TUI multi-panel terminal. Chat is the central workflow, but the user also wants persistent panels for state visibility.

Implementation note:

- the first interactive milestone may ship as a minimal transcript-driven TUI before the full multi-panel workspace is built

## Core System Model

The platform should revolve around six core modules.

### 1. Chat Orchestrator

The Chat Orchestrator is the main entry point for user interaction. It is responsible for:

- receiving natural-language requests
- resolving session context such as selected account, target instrument, active task, or active strategy
- classifying requests into market analysis, execution, strategy control, task creation, account control, and review flows
- invoking downstream application services
- formatting responses in the professional trader voice

This component is not just a chat wrapper around an LLM. It is a stateful trading workflow orchestrator.

### 2. Market Context Engine

This module collects and normalizes current market state for AI reasoning and structured execution planning. It should provide:

- price and candle data
- order book and market microstructure snapshots as needed
- perpetual-specific context such as funding rate
- technical indicator outputs
- market summaries for the current watchlist

Minimum market-data requirements for MVP:

- supported candle intervals: `1m`, `5m`, `15m`, `1h`, `4h`, `1d`
- minimum historical lookback for indicator calculations: 500 candles per requested timeframe when available
- watchlist summary refresh cadence: at least every 5 seconds while the TUI is active
- strategy/task evaluation should use a consistent snapshot of market data per evaluation cycle
- where both polling and streaming are available, streaming is preferred for top-of-book / ticker style updates and polling is acceptable for candle and funding snapshots
- if market data is stale beyond the configured freshness threshold, the AI may continue analysis but must not auto-execute new risk-increasing trades until freshness is restored

The goal is to give the AI enough grounded information to behave like a competent trading operator rather than a purely conversational assistant.

### 3. Strategy Runtime

The Strategy Runtime manages long-running strategy objects. A strategy is a named, parameterized, persistent trading definition that can:

- be created, updated, paused, resumed, or stopped
- run on a schedule or event trigger
- evaluate market context
- emit trading proposals or alerts
- bind to a specific account

Persistence and lifecycle rules for MVP:

- strategies are durable and survive process restarts
- on startup, enabled strategies are reloaded and resume scheduling after state restoration
- each strategy stores last evaluation time, last outcome, current status, and next scheduled evaluation time
- missed evaluations during downtime are not replayed tick-by-tick; instead, the strategy performs a fresh evaluation on restart and records a downtime gap event

The first version should focus on a practical strategy set rather than an overly general quant framework.

### 4. Task Runner

The Task Runner handles temporary and goal-driven user requests. A task represents an ad hoc instruction such as:

- watch BTC and alert on a breakout-and-retest
- monitor ETH for a possible re-entry opportunity today
- rank high-volatility altcoins over the next two hours

Tasks are time-bounded, more naturally expressed in language, and should be first-class objects in the terminal.

Lifecycle rules for MVP:

- tasks are durable across process restarts until they complete, expire, or are canceled
- each task has a creation time, optional expiry time, status, last evaluation time, and result summary
- expired tasks are not resumed automatically after restart
- on restart, active non-expired tasks resume from their latest stored state and record a restart event

### 5. Execution and Risk Engine

This module owns structured trade proposals, risk checks, execution routing, and account-mode enforcement. It should:

- accept structured execution proposals
- apply account permission checks
- apply account risk checks
- route approved actions to OKX
- reject disallowed actions with explicit reasons
- write audit records for every decision path

#### Spot and perpetual execution rules

The MVP must model spot and perpetual products explicitly rather than treating them as the same execution surface.

For spot:

- allowed order actions are buy, sell, and cancel
- leverage is not applicable
- short selling is out of scope
- reduce-only is not applicable
- protective stop/take-profit orders are optional and exchange-support dependent; if native attached protection is unavailable, the proposal may require follow-up protective orders

For perpetual:

- each account must declare `margin_mode` as either `cross` or `isolated`
- each account must declare `position_mode` as either `one_way`; hedge mode is out of scope for MVP
- leverage must be set explicitly per symbol before opening or increasing a position when required by OKX
- allowed order actions are open long, open short, increase, reduce, close, cancel, and modify protection
- reduce-only must be used for close and risk-reducing orders where the exchange supports it
- new positions in duty-trader mode must include a stop-loss plan before execution if `require_stop_loss_for_new_positions` is true

Common proposal fields required by the execution engine:

- account
- symbol using canonical OKX instrument naming
- market type (`spot` or `perpetual`)
- side and intent (`open`, `increase`, `reduce`, `close`, `cancel`, `modify_protection`)
- order type (`market` or `limit` in MVP)
- quantity or notional sizing input
- leverage when market type is perpetual and action increases risk
- reduce-only flag when applicable
- optional stop-loss and take-profit instructions
- provenance (`chat`, `strategy`, `task`, `protective_automation`)

The engine must normalize user-friendly symbol references into a canonical instrument form before any risk or execution step.

### 6. Terminal Workspace

The terminal is a multi-panel workspace with chat at the center and supporting market/trading state around it.

Recommended panels:

- **Chat Panel**: primary conversation and AI workflow surface
- **Account Panel**: current account, mode, permissions, balances, risk summary
- **Positions and Orders Panel**: open positions, open orders, PnL, leverage, recent fills
- **Watch / Market Panel**: watchlist, price changes, funding, alert markers
- **Strategy / Task Panel**: active strategies and active tasks with statuses
- **Event / Audit Panel**: recent system events, execution outcomes, risk rejections, agent summaries

TUI behavior requirements for MVP:

- minimum supported terminal size is **140 columns x 36 rows** for the default multi-panel layout
- if the terminal is smaller than 140x36 but at least **100 columns x 28 rows**, the UI must switch to a degraded two-zone layout with chat plus one focusable detail pane
- if the terminal is smaller than 100x28, the application must refuse to enter the full workspace and instead show a resize-required screen
- default layout is multi-panel with chat as the largest pane
- users can switch focus between panels with keyboard shortcuts
- confirmation prompts must appear in a dedicated modal or inline confirmation area and cannot be hidden behind background updates
- alerts and execution results must surface in both the Chat Panel and Event / Audit Panel
- panel refresh must preserve current input focus and avoid disrupting text entry

## Interaction Model

The system should favor natural language over command memorization. The terminal is not intended to feel like a traditional CLI, even though it runs in a terminal.

Key principles:

- chat is the main workflow
- structured panels provide operational visibility
- keyboard shortcuts support focus changes and common actions
- detailed state should be inspectable without forcing the user into verbose conversations

## Strategy and Task Model

The user wants the system to distinguish clearly between two kinds of work objects.

### Strategies

Strategies are persistent, reusable trading behaviors. Characteristics:

- named
- parameterized
- bound to an account
- long-running
- can be started and stopped
- produce signals or execution proposals

Examples:

- BTC trend-following
- ETH breakout strategy
- SOL grid strategy
- momentum rotation strategy

### Tasks

Tasks are temporary, natural-language assignments. Characteristics:

- time-bounded
- conversationally created
- often event-triggered
- may expire after completion or time window end
- tracked in the terminal as live operational objects

Examples:

- watch BTC tonight and alert if the breakout confirms
- monitor ETH for a lower-risk long entry over the next four hours
- review why today’s trades underperformed

This distinction keeps product semantics simple:

- long-running rule = strategy
- temporary instruction = task

## Chat Semantics

The system should recognize six high-level intent classes.

### Market understanding

Examples:

- “Is BTC strong or weak right now?”
- “Does ETH perpetual look chaseable here?”
- “Summarize the market on OKX today.”

### Trade action

Examples:

- “Open a small BTC probe long.”
- “Raise the stop on that ETH trade.”
- “Cancel all unfilled orders today.”

### Strategy management

Examples:

- “Create a 15-minute BTC breakout strategy.”
- “Pause the ETH grid on alpha.”
- “Reduce risk on the trend strategy.”

### Task delegation

Examples:

- “Watch CPI volatility tonight.”
- “If BTC reclaims that level, give me a setup.”
- “Monitor altcoin momentum for the next two hours.”

### Account and mode control

Examples:

- “Switch to the alpha account.”
- “Set this account to reminder mode.”
- “Which accounts can auto-execute?”

### Review and audit

Examples:

- “Review today’s actions on beta.”
- “Why didn’t you execute that ETH order?”
- “Show me the worst trades this week.”

## Account Model and Safety Boundaries

Accounts are the top-level operational boundary. Each account should have:

- account name
- exchange identity (OKX in MVP)
- runtime mode (reminder or duty trader)
- execution permissions
- risk policy
- API credential binding and connection status
- enabled / disabled state
- optional account-level session-boundary override; otherwise inherit the global default

### Required risk policy fields

The MVP risk policy must be explicit and validated. An account is not eligible for automatic execution unless all required fields are present.

Required fields:

- `max_position_notional_usd`: maximum notional for any single open position
- `max_order_notional_usd`: maximum notional for any newly submitted order
- `max_account_gross_exposure_usd`: maximum gross exposure across all open positions on the account
- `max_per_trade_loss_usd`: maximum planned loss implied by entry and stop for a newly opened trade
- `max_leverage`: maximum leverage allowed for perpetual positions
- `daily_realized_loss_limit_usd`: if reached, no new risk-increasing trades may be opened for the rest of the UTC trading day
- `allowed_symbols`: allowlist of symbols this account may trade (single source of truth; do not duplicate elsewhere)
- `allowed_market_types`: subset of `spot` and `perpetual` (single source of truth; do not duplicate elsewhere)
- `cooldown_seconds_after_close`: minimum delay before re-entering the same symbol after a full close
- `max_open_positions`: maximum concurrent open positions
- `require_stop_loss_for_new_positions`: boolean, true by default for duty-trader accounts
- `allow_overnight_hold`: boolean controlling whether task or strategy logic may keep positions open past the configured session boundary
- `duty_trader_stop_loss_override`: boolean, default `false`; when `true`, a duty-trader account may open a new position without an attached stop-loss plan, but this override must be shown in the Account Panel and included in audit records

The `session boundary` for MVP means the UTC day rollover at `00:00:00Z` unless the account config explicitly defines a different daily session close time.
Evaluation rules for MVP:

- all numeric fields must be positive except cooldown, which may be zero
- duty-trader mode is forbidden if `allowed_symbols` is empty
- duty-trader mode is forbidden if `require_stop_loss_for_new_positions` is false and `duty_trader_stop_loss_override` is not explicitly set to true
- gross exposure is the sum of absolute open-position notionals plus the notional of the proposed order if filled
- if any required risk field is missing, malformed, or cannot be evaluated, the system must reject the proposal and mark the reason as a risk-configuration failure

### Execution permissions

Execution permissions are separate from mode. Each account must define booleans for:

- `can_open_position`
- `can_increase_position`
- `can_reduce_position`
- `can_close_position`
- `can_cancel_order`
- `can_modify_protection_orders`

Duty-trader mode only authorizes automatic execution for actions that are also permitted by these flags.

### Account context UX rules

The system must always maintain an explicit active account for the current chat session.

Rules:

- on startup, no account is active until the user selects one or sets a default in config
- if no account is active, the AI may answer analysis questions but must refuse any execution-capable request and prompt the user to select an account
- account switching is explicit and must immediately update the Account Panel and all new proposals
- every execution proposal and execution result shown in chat must include the target account name and mode

### Core safety requirements

The system must enforce the following:

1. no trading action without explicit account context
2. no autonomous action outside the selected account’s allowed symbols and risk policy
3. no automatic execution for accounts missing required risk configuration
4. every action path must be auditable
5. all rejections must be explicit and human-readable

### Documentation synchronization

The implementation process must treat documentation as part of the product surface.

- changes under `app/` that alter behavior, architecture, data shape, operator workflow, or safety boundaries must update the relevant docs under `docs/` in the same change
- design and plan documents must remain mutually consistent after edits
- a local git pre-commit hook may enforce the minimum rule that staged `app/` changes require staged `docs/` changes

### Out-of-scope dangerous capabilities for MVP

The system should not allow:

- AI-driven self-modification of core trading rules
- AI-driven permission escalation
- automatic expansion of risk limits by the AI
- autonomous global trading across accounts without account-bound context

## Unified Execution Flow

All execution-capable behaviors should normalize into one workflow.

1. **Intent creation**
   - source may be direct chat, strategy trigger, task trigger, or protective automation such as stop management
2. **Proposal generation**
   - produce a structured proposal with instrument, side, sizing, order style, leverage, stop/take-profit, rationale, provenance, and a unique `proposal_id`
3. **Conflict resolution and idempotency**
   - if multiple proposals target the same account and symbol concurrently, the system must apply a deterministic resolution rule
   - MVP rule: only one risk-increasing proposal per account+symbol may be active at a time; additional risk-increasing proposals are rejected with a conflict reason
   - risk-reducing actions such as reduce, close, and protective stop updates may preempt risk-increasing proposals
   - `proposal_id` is used to ensure retries do not duplicate orders
4. **Risk and permission checks**
   - validate against account permissions and risk rules
5. **Mode decision**
   - reminder mode requires user confirmation for all risk-increasing actions
   - duty trader mode can proceed automatically when authorized
   - cancellations and risk-reducing actions may auto-execute in both modes if permitted by the account
6. **Execution or rejection**
   - route to OKX or reject with explicit reason
7. **Report and audit**
   - persist the decision and surface the result back to the terminal

This unified workflow is central to keeping chat, strategies, and tasks consistent.

## User Experience in Practice

The intended experience is that the terminal feels like a staffed desk operator.

For example, the user might say:

> Watch BTC and ETH today with a bullish bias. If you see lower-risk entries, handle them.

The system should respond with something like:

> Current account: OKX-Trader-1
> Mode: Duty Trader
> Scope: BTC/ETH spot and perpetual
> I’ll monitor breakout, retest, and momentum-confirmation structures. If a setup qualifies and passes account risk checks, I’ll execute and report immediately.

Later, it might proactively report:

> BTC perpetual completed a breakout and retest on the 15-minute structure with supportive volume.
> I opened a probe long within the account’s risk limits.
> Stop is at X, first target is Y, current account exposure remains under threshold.

## Technical Architecture

The system should be designed in four layers.

### 1. Interface Layer

Primary responsibilities:

- TUI rendering
- local process startup and terminal control
- local operator interactions

### 2. Application Layer

Primary responsibilities:

- Chat Orchestrator
- Strategy Runtime
- Task Runner
- execution workflow orchestration
- session context management
- notification/event distribution into terminal surfaces

### 3. Domain Layer

Primary responsibilities:

- stable business entities and rules
- accounts, proposals, positions, orders, tasks, strategies, risk policies, audit events
- no direct UI concerns

### 4. Infrastructure Layer

Primary responsibilities:

- OKX integration
- market data ingestion
- scheduler
- local persistence
- event bus
- LLM adapter
- config and secrets loading

This layered design preserves the possibility of future remote or multi-interface expansion without forcing it into the MVP.

## Storage Model

The recommended storage model is local-first and hybrid.

### Directory layout

The MVP must use a predictable on-disk layout under a single application data directory:

- `data/config/` — JSON configuration files
- `data/secrets/` — local secret material (not committed); exact storage mechanism decided during implementation planning
- `data/logs/` — application logs
- `data/sessions/` — raw chat/session transcripts
- `data/market/` — cached market data snapshots
- `data/state/` — durable runtime state (task/strategy checkpoints if not stored in SQLite)
- `data/db/app.sqlite` — SQLite operational database

### File-based storage for configuration

Use files for:

- account definitions
- strategy definitions
- task templates
- UI preferences
- static risk settings

Config requirements:

- configs must be validated at startup
- configs must be versioned with a `schema_version` field for forward migration

Benefits:

- easy local editing
- easy versioning
- transparent debugging

### SQLite for operational history

Use SQLite for:

- audit events
- order history
- execution records
- position snapshots
- task state changes
- strategy runtime history
- searchable summaries

Database requirements:

- tables must include timestamps, account_id, and correlation identifiers
- include a migrations mechanism and bumpable schema version

Benefits:

- efficient querying for review and audit
- simple local deployment
- straightforward migration path later

### File plus indexed metadata for long-form logs

Use files for raw conversations and narrative summaries, with SQLite indexes for retrieval.

## Audit Model

Every significant decision and action must be captured as an audit event with enough structure to support later review.

Minimum audit record fields:

- `event_id`: unique identifier
- `timestamp`: ISO timestamp
- `account_id` and `account_name`
- `session_id`: current chat session identifier
- `source`: `chat` | `strategy` | `task` | `protective_automation`
- `proposal_id`: identifier for the proposal this event belongs to, if applicable
- `symbol` and `market_type`
- `intent`: `open` | `increase` | `reduce` | `close` | `cancel` | `modify_protection`
- `mode`: reminder or duty-trader at decision time
- `decision`: proposed | confirmed | rejected | executed | failed
- `reason_code` and `reason_human`: for any rejection or failure
- `risk_snapshot`: key risk policy values and the evaluated metrics for the proposal
- `execution_snapshot`: broker request/response identifiers where applicable (order_id, client_order_id)
- `correlation_id`: ties together multi-step workflows such as proposal -> confirmation -> execution

Review and replay requirements for MVP:

- the user can request a human-readable narrative review for an account for a time window
- the user can ask why a specific proposal was rejected or why a specific order was placed
- the system can reconstruct the decision path for a proposal from audit events in chronological order

## Remote-Ready Boundaries

Although the MVP is local-first, the architecture should preserve future remote deployment options.

Recommended boundaries:

- TUI should talk to application services, not directly to OKX
- secrets should be loaded through a centralized abstraction
- active events should flow through a unified event bus
- session context should be separate from account state

This makes it easier later to add a web console, notifications, remote workers, or a hosted control plane.

## AI Role in the System

The AI should be treated as a high-level decision and orchestration actor, not as an all-powerful bypass around product rules.

The AI may:

- interpret user intent
- analyze market context
- generate or refine trading proposals
- trigger approved workflows
- summarize outcomes and review history

The AI must not bypass:

- account permissions
- risk policies
- execution workflow normalization
- audit logging

## Testing Strategy

The first phase should use a four-layer testing approach.

### 1. Domain unit tests

Test:

- risk policy evaluation
- execution permission decisions
- proposal validation
- strategy condition logic
- task lifecycle transitions

### 2. Application workflow tests

Test:

- routing from chat intents into workflows
- reminder mode versus duty trader mode behavior
- risk rejection reporting
- strategy and task integration into unified execution flow

### 3. Infrastructure integration tests

Test:

- OKX adapters
- market-data adapters
- persistence layer
- scheduler behavior
- event bus plumbing

### 4. TUI interaction tests

Test:

- panel rendering
- state refresh
- focus switching
- confirmation prompts
- critical event visibility

## MVP Scope

### In scope

- single-user local deployment
- pure TUI multi-panel workspace
- OKX integration
- spot and perpetual support
- account-level reminder/duty-trader modes
- chat-driven market analysis and execution workflows
- basic strategy runtime
- basic task runner
- unified execution flow with auditability
- review and replay of execution decisions

### Deferred

- advanced backtesting platform
- complex strategy IDE
- multi-exchange rollout
- multi-user support
- full web platform
- advanced research workbench
- AI self-modification of trading core or permissions

## MVP Product Statement

The MVP is a local AI Trader TUI for OKX that lets a single user interact with a professional-style AI trader through chat while continuously viewing account state, positions, orders, strategies, tasks, and audit events. It supports both reminder and automatic duty-trader account modes, and unifies strategy-driven and task-driven trading flows under one structured execution and risk pipeline.

## Recommended Direction

The recommended implementation direction is to build a new focused system rather than clone OpenAlice. OpenAlice is useful as inspiration for local-first trading workflows, AI-driven orchestration, and account-based control, but this product should be architected from the start around a narrower identity: a terminal-native AI trader workstation.
