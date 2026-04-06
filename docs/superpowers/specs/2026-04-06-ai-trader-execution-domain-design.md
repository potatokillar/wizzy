# AI Trader Execution Domain Design

## Purpose

This document refines the MVP execution domain so implementation in `app/` can proceed without re-deciding proposal shape, decision shape, and risk-evaluation contracts during coding.

It is subordinate to:

- `docs/superpowers/specs/2026-03-26-ai-trader-terminal-design.md`
- `docs/superpowers/plans/2026-03-26-ai-trader-terminal-mvp.md`

## Scope

This detailed design defines:

- execution-facing domain entities
- proposal and decision lifecycle
- risk-evaluation input and output contracts
- mode-gating behavior
- rejection and audit reason-code conventions

Chat parsing and clarification behavior are defined separately in:

- `docs/superpowers/specs/2026-04-06-ai-trader-chat-parsing-design.md`
- `docs/superpowers/specs/2026-04-06-ai-trader-order-selection-design.md`

This document does not define:

- OKX HTTP/WebSocket payload details
- strategy logic internals
- TUI rendering

## Core Types

### Account execution context

Execution logic must receive a resolved account context, not just an account id string.

Minimum required fields:

- `account_id`
- `account_name`
- `exchange`
- `enabled`
- `mode`: `reminder | duty_trader`
- `execution_permissions`
- `risk_policy`
- optional `perpetual_settings`
- optional `session_boundary_utc`
- runtime flags such as `kill_switch_active`

### TradeProposal

`TradeProposal` is the canonical input to the execution workflow.

Required fields:

- `proposal_id`
- `created_at`
- `account_id`
- `account_name`
- `symbol`
- `market_type`: `spot | perpetual`
- `intent`: `open | increase | reduce | close | cancel | modify_protection`
- `side`: `buy | sell`
- `order_type`: `market | limit`
- `size`
- `provenance`: `chat | strategy | task | protective_automation`
- `rationale_summary`

Optional fields:

- `limit_price`
- `time_in_force`
- `leverage`
- `reduce_only`
- `stop_loss`
- `take_profit`
- `source_ref`
- `selection_scope`
- `selection_side`
- `selection_price`
- `correlation_id`
- `market_snapshot_ref`
- `idempotency_key`

For `cancel`, `source_ref` should contain the resolved live exchange order id once selection is complete.

### Size

MVP size input must support exactly one of:

- `quantity`
- `base_units`
- `quote_notional`
- `notional_usd`

The normalized proposal passed into exchange execution should also include a derived notional estimate when available.

### Protective instructions

`stop_loss` and `take_profit` should use a uniform shape:

- `trigger_price`
- optional `order_price`
- optional `reduce_only`
- optional `size_fraction`
- `kind`: `stop_loss | take_profit`

For MVP, `size_fraction` defaults to full-position protection if omitted.

### ExecutionDecision

`ExecutionDecision` is the canonical workflow output.

Required fields:

- `decision_id`
- `proposal_id`
- `timestamp`
- `account_id`
- `mode`
- `status`
- `reason_code`
- `reason_human`
- `requires_confirmation`
- `audit_event_ids`

Allowed `status` values:

- `proposal_created`
- `rejected`
- `confirmation_required`
- `confirmed`
- `submitted`
- `executed`
- `failed`
- `canceled`

## Proposal Lifecycle

All execution-capable flows must normalize into the same lifecycle:

1. create or normalize proposal
2. attach account context
3. canonicalize symbol and market type
4. attach derived notional estimate where possible
5. run conflict checks
6. run permission checks
7. run risk checks
8. apply mode gating
9. execute or reject
10. write audit events for each branch

There must be no direct exchange submission that bypasses this lifecycle.

## Risk Classification

The workflow must classify each proposal before mode gating.

### Risk-increasing intents

Treat these as risk-increasing by default:

- `open`
- `increase`
- any `modify_protection` that widens stop distance or removes protection

### Risk-neutral or risk-reducing intents

Treat these as non-increasing by default:

- `reduce`
- `close`
- `cancel`
- `modify_protection` that tightens stop distance or adds missing protection

If risk direction cannot be determined safely, classify as risk-increasing.

## Mode Gating

### Reminder mode

- risk-increasing proposals return `confirmation_required`
- risk-reducing or risk-neutral actions may auto-execute if permissions allow
- analysis-only responses must not create executable orders

### Duty trader mode

- permitted proposals may auto-execute after passing conflict, permission, and risk checks
- risk-increasing proposals must still be blocked by stale market data, invalid risk config, kill switch, and missing stop-loss rules

## Risk Evaluation Contract

`RiskEvaluator` should expose a pure application-facing contract.

Input shape:

- `account`
- `proposal`
- `open_positions`
- `open_orders`
- `recent_closes`
- `realized_daily_loss_usd`
- `market_freshness`
- `now`

Output shape:

- `ok`
- `reason_code`
- `reason_human`
- `derived_metrics`
- `requires_stop_loss`
- `risk_classification`

`derived_metrics` should include, when available:

- `proposal_notional_usd`
- `gross_exposure_after_fill_usd`
- `position_notional_after_fill_usd`
- `planned_trade_loss_usd`
- `cooldown_remaining_seconds`

## Reason Codes

Reason codes should be stable, snake_case, and safe to persist in audit history.

### Configuration failures

- `risk_configuration_invalid`
- `missing_account_context`
- `account_disabled`
- `kill_switch_active`
- `perpetual_settings_missing`

### Permission failures

- `permission_denied_open_position`
- `permission_denied_increase_position`
- `permission_denied_reduce_position`
- `permission_denied_close_position`
- `permission_denied_cancel_order`
- `permission_denied_modify_protection`

### Risk failures

- `allowed_symbol_violation`
- `allowed_market_type_violation`
- `market_data_stale`
- `daily_loss_limit_reached`
- `max_order_notional_exceeded`
- `max_position_notional_exceeded`
- `max_account_gross_exposure_exceeded`
- `max_per_trade_loss_exceeded`
- `max_leverage_exceeded`
- `max_open_positions_exceeded`
- `cooldown_active`
- `stop_loss_required`
- `overnight_hold_disallowed`

### Workflow failures

- `confirmation_required`
- `proposal_conflict_active`
- `exchange_submission_failed`
- `exchange_rejected`
- `idempotency_conflict`

## Audit Requirements

Every branch in the lifecycle must write an audit event with:

- `proposal_id`
- `correlation_id`
- `account_id`
- `symbol`
- `intent`
- `mode`
- `decision`
- `reason_code`
- `reason_human`
- serialized risk snapshot
- serialized execution snapshot when relevant

The audit log must be sufficient to answer:

- why was this proposal rejected
- why did this proposal require confirmation
- why did this proposal auto-execute
- why did this proposal fail at the exchange layer

## Implementation Guidance

Suggested initial file ownership in `app/`:

- `src/domain/trading/TradeProposal.ts`
- `src/domain/trading/ExecutionDecision.ts`
- `src/domain/account/Account.ts`
- `src/domain/risk/RiskPolicy.ts`
- `src/application/risk/RiskEvaluator.ts`
- `src/application/execution/ExecutionWorkflow.ts`
- `src/domain/audit/AuditEvent.ts`

The first coding slice should implement these types and tests before real OKX submission.
