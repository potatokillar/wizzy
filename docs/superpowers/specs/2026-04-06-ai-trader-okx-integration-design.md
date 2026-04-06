# AI Trader OKX Integration Design

## Purpose

This document narrows the MVP OKX adapter contract so exchange integration can be built behind stable interfaces in `app/src/infrastructure/okx`.

## Scope

This detailed design covers:

- instrument normalization
- market-data adapter responsibilities
- order-submission contract
- spot vs perpetual payload differences
- leverage and protection handling

This document does not attempt to fully document every OKX endpoint.

## Adapter Boundaries

MVP should expose thin infrastructure adapters with application-facing interfaces:

- `OkxSymbolMapper`
- `OkxRestClient`
- `OkxWsClient`

Application services must not build raw OKX request payloads directly.

## Canonical Symbol Form

Before risk or execution, all symbols must normalize into canonical OKX instrument ids.

Examples:

- `BTC/USDT` -> `BTC-USDT`
- `btc usdt` -> `BTC-USDT`
- `btc perp` -> `BTC-USDT-SWAP`
- `eth swap` -> `ETH-USDT-SWAP`

Normalization rules for MVP:

- assume quote currency `USDT` unless the user explicitly supplies another supported quote
- `perp`, `swap`, and `perpetual` map to `-SWAP`
- spot symbols do not include `-SWAP`
- ambiguous symbols that cannot be resolved safely must fail normalization instead of guessing

## Market Data Contract

`OkxRestClient` must provide methods sufficient for MVP:

- fetch ticker snapshot by instrument ids
- fetch candles by instrument id and timeframe
- fetch funding rate for perpetual instruments
- fetch positions for the active account
- fetch open orders for the active account

`OkxWsClient` may initially support:

- ticker/top-of-book streaming for watchlist instruments
- reconnect and subscription lifecycle

If WebSocket becomes a blocker, polling is acceptable for MVP except where the design explicitly prefers streaming.

## Order Submission Contract

`ExecutionWorkflow` should call an exchange adapter that accepts normalized execution instructions, not raw chat text.

Minimum normalized execution input:

- `instId`
- `marketType`
- `intent`
- `side`
- `ordType`
- sizing fields
- optional `px`
- optional `tdMode`
- optional `lever`
- optional `reduceOnly`
- optional `slTriggerPx`
- optional `tpTriggerPx`

## Spot Rules

For spot instruments:

- supported intents are `open`, `increase`, `reduce`, `close`, and `cancel`
- leverage is not applicable
- `tdMode` should not be relied on for margin-style semantics in MVP
- short selling is out of scope
- reduce-only is not applicable

Interpretation guidance:

- `open` or `increase` long spot exposure normally maps to `buy`
- `reduce` or `close` long spot exposure normally maps to `sell`

## Perpetual Rules

For perpetual instruments:

- `tdMode` derives from account `margin_mode`
- `position_mode` is always `one_way` in MVP
- `lever` must be set before opening or increasing exposure when required
- `reduceOnly` must be enabled for close and risk-reducing orders where supported

Interpretation guidance:

- open/increase long -> `buy`
- open/increase short -> `sell`
- reduce/close long -> `sell` with reduce-only when supported
- reduce/close short -> `buy` with reduce-only when supported

## Leverage Handling

Leverage changes must not be hidden inside arbitrary execution calls.

MVP behavior:

- before a perpetual `open` or `increase`, compare desired leverage with known exchange state
- if leverage must change, submit a dedicated leverage-setting request first
- audit both the leverage-setting step and the subsequent order step

If leverage cannot be set successfully, the proposal fails before order submission.

## Protection Handling

Protection support differs between products and endpoints, so the adapter contract must not assume native attached protection always exists.

MVP rule:

- if native stop-loss or take-profit attachment is supported for the concrete order path, use it
- otherwise, execute the primary order and create a follow-up protective action or task
- never silently drop requested protection

## Idempotency and Correlation

Every execution attempt should carry:

- `proposal_id`
- `correlation_id`
- optional client order id when supported by the exchange adapter

Retries must reuse the same identifiers where safe so audit and de-duplication remain coherent.

## Suggested Interfaces

Initial implementation should target these infrastructure responsibilities:

- `normalizeSymbol(input) -> NormalizedSymbolResult`
- `fetchWatchlistTickers(instIds) -> TickerSnapshot[]`
- `fetchCandles(instId, timeframe, limit) -> Candle[]`
- `fetchFunding(instId) -> FundingSnapshot`
- `placeOrder(input) -> ExchangeOrderResult`
- `cancelOrder(input) -> ExchangeOrderResult`
- `setLeverage(input) -> ExchangeMutationResult`

## Failure Handling

The adapter layer must return structured failures, not opaque strings.

Minimum error shape:

- `code`
- `message`
- `retryable`
- optional `raw`

Application services should convert adapter failures into stable audit reason codes such as:

- `exchange_submission_failed`
- `exchange_rejected`
- `market_data_fetch_failed`

## Implementation Guidance

Suggested initial file ownership in `app/`:

- `src/infrastructure/okx/OkxSymbolMapper.ts`
- `src/infrastructure/okx/OkxRestClient.ts`
- `src/infrastructure/okx/OkxWsClient.ts`
- `src/application/market/MarketContextService.ts`
- `src/application/execution/ExecutionWorkflow.ts`

Implementation should start with payload builders and interface-level tests before live network behavior.
