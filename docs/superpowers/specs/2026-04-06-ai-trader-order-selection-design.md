# AI Trader Order Selection Design

## Purpose

This document defines how the MVP resolves chat-level order references into specific live exchange orders.

It exists because `cancel` and future order-management actions are unsafe if the system selects a target order using loose heuristics.

## Scope

This detailed design covers:

- order-selection inputs
- deterministic matching rules for `cancel`
- ambiguity handling
- clarification versus rejection rules
- execution-layer binding requirements

This document does not define:

- exchange-specific order query APIs
- advanced portfolio-wide order management logic
- bulk smart-routing across multiple accounts

## Design Principle

Order selection must be narrower than trade parsing.

Rules:

- do not cancel an order unless the target order set is deterministically resolved
- if more than one live order matches the request, prefer clarification over guessing
- if no live order matches, reject explicitly
- selection happens against live open-order state, not stale chat memory

## Terminology

### Order reference

A user phrase that points to one or more existing live orders.

Examples:

- `cancel the BTC order`
- `cancel that ETH limit`
- `cancel my 81200 BTC bid`
- `cancel all BTC orders`

### Selection outcome

The result of matching an order reference against current live open orders.

Allowed outcomes:

- `single_order_selected`
- `multiple_orders_selected`
- `clarification_required`
- `no_match`
- `unsupported_request`

## Inputs To Selection

The order-selection layer should receive:

- active account context
- live open orders for that account
- parsed order-selection hints from chat

Suggested parsed hints:

- `symbol_hint`
- `market_type_hint`
- `side_hint`
- `order_type_hint`
- `price_hint`
- `quantity_hint`
- `selection_scope`
- `source_text`

In the current implementation, these hints may flow into cancel proposals as optional selection fields before final order-id binding:

- `selection_scope`
- `selection_side`
- `selection_price`

## Selection Scope

The parser should distinguish these scopes:

- `single_best_match`
- `all_for_symbol`
- `all_for_account`

MVP default:

- plain `cancel BTC order` means `single_best_match` only if exactly one live order matches
- `cancel all BTC orders` means `all_for_symbol`
- `cancel all open orders` means `all_for_account`

If bulk cancellation support is not yet implemented in the execution layer, these multi-order scopes should return `unsupported_request` or `clarification_required` rather than silently degrading to a single-order cancel.

## Matching Dimensions

Order matching should use the following dimensions, in order of reliability:

1. explicit exchange order id
2. symbol + market type + side + order type + price
3. symbol + market type + side + order type
4. symbol + market type

The matching algorithm must stop as soon as more than one candidate remains and no stronger hint is available.

## Deterministic Single-Order Rule

MVP may auto-select a single order only when the filtered candidate set contains exactly one live order.

Examples that may auto-resolve:

- only one open BTC perpetual order exists, and the user says `cancel BTC perp order`
- only one order exists at price `81200` for BTC, and the user says `cancel BTC 81200 order`

Examples that must not auto-resolve:

- two BTC perpetual orders exist and the user says `cancel BTC order`
- one BTC bid and one BTC ask exist and the user says `cancel BTC limit`

## Clarification Rules

Use clarification when:

- more than one live order matches the parsed hints
- the request names a symbol but not enough detail to isolate one order
- the user says `that order` and the current MVP has no stable conversational order reference memory

Suggested clarification format:

- `type: clarification_required`
- `missing_fields`
- `question`
- optional short candidate summary

Examples:

- `There are 2 BTC perpetual orders. Specify price or side.`
- `There are 3 ETH orders. Specify which one to cancel by price.`

## Rejection Rules

Reject immediately when:

- no open order matches the request
- the request implies bulk cancellation that is not implemented
- the request depends on conversational references such as `that order` without a supported reference system

Suggested reason codes:

- `open_order_not_found`
- `multiple_open_orders_match`
- `bulk_cancel_not_supported`
- `order_reference_not_supported`

## Bulk Cancellation

Bulk cancellation is a separate behavior from single-order selection.

MVP should treat it explicitly:

- `cancel all BTC orders`
- `cancel all open orders`

Recommended MVP implementation order:

1. support deterministic single-order cancel first
2. add explicit symbol-scoped bulk cancel second
3. add account-wide bulk cancel later

Do not overload the single-order path to partially execute bulk instructions.

## Parser Requirements

The chat parser should extract these hints for cancel requests when present:

- symbol
- market type
- order side such as `bid` or `ask`
- order type such as `limit`
- explicit price
- explicit scope words such as `all`

If the parser cannot reliably tell whether the user wants one order or many, it should not create a cancel proposal directly.

## Execution Binding

The execution workflow must bind the final selected target into proposal data before exchange submission.

Suggested proposal fields:

- `intent: cancel`
- `source_ref`: exchange order id for single-order cancel
- optional execution payload extension for bulk scopes when implemented

This ensures that the exchange adapter receives a concrete target, not a symbolic hint.

## Interaction With Chat Parsing

Chat parsing and order selection are separate stages:

1. chat parsing extracts order-selection hints
2. execution-layer selection evaluates those hints against live open orders
3. the workflow either binds a concrete order id, asks for clarification, or rejects

The parser must not pretend to know the target order without live state.

## Current MVP Constraint

The current implementation only supports:

- single-order cancel
- exactly one matching live order for the given symbol and market type

This is acceptable for now, but it is intentionally narrower than the long-term design in this document.

## Immediate Implementation Guidance

The next implementation steps should be:

1. extend `ParsedTradeIntent` with cancel-specific selection hints
2. introduce an order-selection helper in the execution layer
3. return `clarification_required` when multiple live orders match
4. keep `source_ref` binding as the final output for single-order cancel

## Trigger To Pause Development Again

Pause for another design pass if implementation needs:

- conversational references such as `cancel that one`
- partial bulk cancel rules
- ranking or prioritizing one order among several candidates
- mixed symbol/account-level bulk cancellation with confirmation policies
