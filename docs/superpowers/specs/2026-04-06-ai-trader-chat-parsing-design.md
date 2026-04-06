# AI Trader Chat Parsing Design

## Purpose

This document defines the MVP boundary between natural-language chat input and structured trading proposals.

It exists because the execution path is already in place, but the current chat parsing logic is intentionally minimal. Without a clear parsing design, the project will quickly accumulate unsafe heuristics in `ChatOrchestrator`.

## Scope

This detailed design covers:

- chat message normalization
- intent-to-workflow routing
- trade-request parsing rules
- ambiguity handling
- when to ask for clarification versus when to reject
- what the MVP parser may infer automatically

This document does not define:

- final LLM prompt design
- full strategy-creation language
- market-analysis response generation

Order-to-live-order binding rules for cancel flows are defined separately in:

- `docs/superpowers/specs/2026-04-06-ai-trader-order-selection-design.md`

## Parsing Principle

The MVP parser must favor safety and determinism over conversational flexibility.

Rules:

- only infer fields when the inference rule is narrow and explicit
- if a missing field could materially change execution risk, do not guess
- ambiguous execution-capable requests must become clarification flows, not executable proposals
- the parser must produce a structured intermediate object before `TradeProposal`

## Pipeline

The chat pipeline for execution-capable requests should be:

1. normalize raw user message
2. classify high-level intent
3. resolve session account context
4. parse a structured trade request candidate
5. validate that required execution fields are sufficiently specified
6. either:
   - create a `TradeProposal`
   - ask a clarification question
   - reject the request as unsupported in MVP

There must be no direct path from raw text to exchange execution.

## High-Level Intents

The classifier should continue to recognize these buckets:

- `account_control`
- `market_understanding`
- `trade_action`
- `strategy_management`
- `task_delegation`
- `review_audit`
- `unknown`

Only `trade_action` may proceed into proposal parsing.

## Intermediate Parse Object

Before creating `TradeProposal`, the parser should produce a `ParsedTradeIntent`.

Suggested fields:

- `account_ref`
- `symbol_hint`
- `market_type_hint`
- `direction`
- `intent`
- `order_type`
- `size_hint`
- `limit_price_hint`
- `stop_loss_hint`
- `take_profit_hint`
- `selection_scope`
- `time_horizon_hint`
- `confidence`
- `ambiguities`
- `source_text`

This object is intentionally more permissive than `TradeProposal`.

## What MVP May Infer Automatically

The MVP parser may infer the following only under explicit rules.

### Account

- use the active session account if one is selected
- if no active account exists, execution-capable requests must not parse into proposals

### Symbol

Allowed deterministic inference in MVP:

- explicit `BTC`, `ETH`, `SOL` style asset mentions may map to canonical configured symbols
- if a message contains exactly one configured symbol family, use it
- if more than one plausible symbol is present, require clarification

### Market type

Allowed deterministic inference in MVP:

- `perp`, `swap`, or `perpetual` -> `perpetual`
- `spot` -> `spot`

If market type is omitted:

- if the active account only allows one market type for that symbol family, infer it
- otherwise require clarification

### Direction

Allowed deterministic inference in MVP:

- `long`, `buy` -> long/buy side
- `short`, `sell` -> short/sell side

If direction is absent for an execution-capable request, require clarification.

### Intent

Allowed deterministic inference in MVP:

- `open`, `buy`, `long`, `short` -> `open`
- `add`, `increase` -> `increase`
- `trim`, `reduce` -> `reduce`
- `close`, `exit`, `flatten` -> `close`
- `cancel` -> `cancel`
- `raise stop`, `lower stop`, `move stop` -> `modify_protection`

For `cancel`, the parser should also extract order-selection hints such as:

- `all`
- explicit price
- `bid` / `ask`
- `limit`

### Size

The parser may recognize:

- `small`, `probe`, `starter`
- explicit USD notionals such as `100u`, `$100`, `100 usdt`
- explicit quantities if the syntax is unambiguous

However, MVP must not silently convert subjective sizing words into live orders unless a configured mapping exists.

Recommended MVP rule:

- `small`, `probe`, and `starter` map to a configured default notional only if the config defines one
- otherwise require clarification

### Protection

The parser may recognize:

- `stop at 81200`
- `sl 81200`
- `tp 84500`

If a duty-trader perpetual request increases risk and no stop-loss can be parsed:

- do not attempt to invent one
- either ask a clarification question or reject based on mode/risk policy

## Clarification vs Rejection

The parser must distinguish recoverable ambiguity from unsupported behavior.

### Clarification flow

Use clarification when:

- symbol is ambiguous
- market type is ambiguous
- direction is missing
- size is missing for a risk-increasing order
- a protective instruction is required but missing and can reasonably be requested

Clarification should return a structured question, not a free-form apology.

Suggested MVP output:

- `type: clarification_required`
- `missing_fields`
- `question`

### Rejection flow

Reject immediately when:

- no active account exists
- the request asks for unsupported behavior in MVP
- the request combines too many actions in one sentence for the deterministic parser
- parsing confidence is too low for safe clarification

## Unsupported Trade Expressions in MVP

The following should be explicitly out of scope for deterministic parsing:

- multi-leg conditional instructions in one sentence
- laddered entries and exits
- trailing-stop semantics
- partial take-profit ladders
- cross-symbol relative expressions such as `long ETH against BTC weakness`
- instructions that depend on unstated chart levels such as `buy the reclaim`

These should either:

- route to a future LLM-planning path
- or respond that the instruction is not yet supported in MVP

## Proposal Construction Rules

Only create `TradeProposal` when these fields are resolved:

- account
- symbol
- market type
- intent
- side
- order type
- size

For `limit` orders, `limit_price` must also be resolved.

For risk-increasing duty-trader perpetual proposals, a stop-loss must also be resolved or the workflow must stop before proposal creation.

## Parser Configuration

The deterministic parser should rely on configuration where possible rather than hardcoding behavior.

Suggested config-owned items:

- allowed symbol aliases
- default quote currency
- default sizing presets such as `probe` or `small`
- parser feature flags

This lets the parser evolve without forcing constant code edits.

## Chat Reply Contract

`ChatOrchestrator` should not return plain text only.

The next design step for implementation should introduce structured chat outcomes such as:

- `analysis_reply`
- `proposal_created`
- `confirmation_required`
- `clarification_required`
- `execution_result`
- `unsupported_request`

Text rendering should remain a presentation concern.

## Immediate Implementation Guidance

The current implementation should be refactored in this order:

1. extract deterministic trade parsing from `ChatOrchestrator` into a dedicated parser module
2. introduce `ParsedTradeIntent`
3. add clarification outcomes before creating proposals
4. stop hardcoding default symbol, market type, and size where ambiguity exists
5. keep execution workflow unchanged once a valid `TradeProposal` is created

## Trigger To Pause Development Again

If implementation needs any of the following, development should pause for another design pass:

- LLM-assisted parsing or planning
- conversational multi-turn clarification memory
- user-defined parser aliases or sizing presets
- support for compound orders or multi-step execution instructions
