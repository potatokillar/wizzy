# AI Trader TUI State Design

## Purpose

This document defines the MVP TUI state model so the Ink interface can stay thin while still supporting multi-panel visibility, chat-driven workflow, and non-disruptive refresh behavior.

The first interactive milestone is defined separately in:

- `docs/superpowers/specs/2026-04-06-ai-trader-minimal-tui-design.md`

## TUI Design Principle

The TUI is an operator workspace, not the source of trading truth.

Therefore:

- business logic lives in application and domain services
- the TUI consumes derived state and emits user intents
- background refresh must not mutate operator input in surprising ways

## Store Boundary

`TuiStore` should be the local interface-state container for Ink components.

It should not:

- perform risk checks
- talk to OKX directly
- own durable business state

It may:

- hold current panel focus
- hold chat transcript state
- hold pending confirmation UI state
- mirror latest account, market, position, strategy, task, and audit summaries

## Suggested Store Shape

Minimum top-level slices:

- `layout`
- `focus`
- `chat`
- `confirmation`
- `accountView`
- `positionsView`
- `marketView`
- `strategyTaskView`
- `auditView`
- `status`

### `layout`

Should include:

- terminal size
- resolved layout mode: `multi_panel | degraded_two_zone | resize_required`
- focused detail pane in degraded mode

### `focus`

Should include:

- focused panel id
- input mode: `chat | confirmation | navigation`

### `chat`

Should include:

- transcript entries
- current draft input
- submit-in-flight flag
- last reply summary

Transcript entry types should distinguish:

- user message
- assistant analysis
- proposal summary
- execution result
- alert
- review narrative

### `confirmation`

Should include:

- `open`
- `proposal_id`
- rendered summary fields for the prompt
- confirm/cancel hotkeys

Only one confirmation prompt should be active at a time in MVP.

### `accountView`

Should include:

- active account name
- mode
- permissions summary
- balances summary
- risk summary
- kill-switch state
- connection state

### `positionsView`

Should include:

- open positions
- open orders
- recent fills summary
- unrealized pnl summary

### `marketView`

Should include:

- watchlist symbols
- latest ticker summaries
- funding snippets
- staleness flags
- alert markers

### `strategyTaskView`

Should include:

- active strategies
- active tasks
- paused items
- latest runtime events

### `auditView`

Should include:

- recent audit events
- recent execution outcomes
- recent risk rejections

## Event Flow

The TUI should subscribe to application events through a typed event bus.

Typical flow:

1. user submits chat input
2. orchestrator returns reply or execution proposal state
3. store appends chat entries
4. workflow emits audit/execution events
5. store updates summary panels
6. if confirmation is required, store opens confirmation prompt

## Focus and Refresh Rules

The TUI must preserve operator input focus.

Required behavior:

- background market refresh must not clear current chat draft
- background events must not close a visible confirmation prompt
- panel re-render must not steal keyboard focus from the active input target
- resize handling must preserve transcript and draft state

## Component Responsibilities

### `App.tsx`

- composition root for Ink
- subscribes store to app services
- resolves layout mode
- routes global shortcuts

### `ChatPanel.tsx`

- render transcript
- render draft input
- dispatch submit actions

### `ConfirmationPrompt.tsx`

- render current proposal summary
- capture confirm/cancel action
- remain visually prominent

### `AccountPanel.tsx`

- render active account and safety posture

### `PositionsOrdersPanel.tsx`

- render positions, open orders, and fill summaries

### `WatchMarketPanel.tsx`

- render watchlist market summaries and staleness

### `StrategyTaskPanel.tsx`

- render strategy and task runtime summaries

### `EventAuditPanel.tsx`

- render recent workflow and audit events

## Keyboard Model

MVP keyboard rules should stay simple.

Support:

- panel focus switching
- submit chat
- confirm/cancel prompt
- cycle detail pane in degraded mode

Do not introduce a large command palette or modal navigation system in MVP.

## Testing Guidance

Initial TUI tests should verify:

- layout breakpoint resolution
- prompt visibility for reminder-mode risk-increasing requests
- core panel headings render in multi-panel mode
- current chat draft survives background refresh
- resize-required state appears below minimum supported size

## Implementation Guidance

Suggested initial file ownership in `app/`:

- `src/interface/tui/App.tsx`
- `src/interface/tui/state/TuiStore.ts`
- `src/interface/tui/layout/useTerminalLayout.ts`
- `src/interface/tui/components/ChatPanel.tsx`
- `src/interface/tui/components/ConfirmationPrompt.tsx`
- `src/interface/tui/components/AccountPanel.tsx`
- `src/interface/tui/components/PositionsOrdersPanel.tsx`
- `src/interface/tui/components/WatchMarketPanel.tsx`
- `src/interface/tui/components/StrategyTaskPanel.tsx`
- `src/interface/tui/components/EventAuditPanel.tsx`
- `src/interface/tui/hooks/useKeyboardShortcuts.ts`

Implementation should begin with store shape, layout resolver, and confirmation flow before building all display panels.
