# AI Trader Minimal TUI Design

## Purpose

This document defines the first interactive TUI slice for the MVP.

It is intentionally narrower than the full workspace vision. The goal is to ship a usable terminal shell around the existing application container without blocking on the complete multi-panel interface.

## Scope

This detailed design covers:

- the first TUI screen and component set
- chat input and structured reply rendering
- confirmation display behavior
- review output rendering
- minimal state shape for the first interactive shell

This document does not define:

- the full multi-panel workspace
- market watch panels
- strategy/task panels
- advanced keyboard navigation

## Design Principle

The first TUI should prove end-to-end interaction, not visual completeness.

Rules:

- prefer one stable interactive surface over many partial panels
- render structured application results, do not recreate business logic in the UI
- keep the UI state small and disposable
- preserve input continuity during updates

## MVP Slice

The first TUI should support exactly these user-visible capabilities:

- show startup status
- show active account summary
- accept a chat message
- render the resulting structured reply
- show clarification prompts
- show confirmation-required messages
- show execution results
- show review output when wired later

## Screen Model

The first screen may be a single-column terminal layout with three vertical sections:

1. header
2. transcript
3. input

Optional fourth section:

4. status/footer

This is intentionally simpler than the final multi-panel workspace.

## Header Content

The header should show:

- app name
- active account id or name
- current mode
- startup readiness
- degraded status if present

This gives the operator immediate context before any chat input.

## Transcript Model

The transcript should append entries in chronological order.

Suggested entry types:

- `user`
- `analysis_reply`
- `clarification_required`
- `confirmation_required`
- `execution_result`
- `review_result`
- `system_status`

The transcript should render text-first, with minimal decoration.

## Input Model

The first TUI should maintain:

- current draft input
- submit-in-flight flag

Required behavior:

- Enter submits the current draft
- successful submission clears the draft
- failed or blocked submission should preserve the draft when useful

## Chat Reply Rendering

The UI must render by `ChatReply.type`, not by brittle text parsing.

### `analysis_reply`

- render as standard assistant output

### `clarification_required`

- render the question
- render missing fields as compact hints
- do not open a separate modal in the first TUI slice

### `confirmation_required`

- render prominently in the transcript
- include account and mode context if present in the text
- the first TUI slice may stop at display-only confirmation rather than implementing interactive confirm/cancel actions

### `execution_result`

- render as a result entry
- preserve rejection and execution wording from application services

### `unsupported_request`

- render as a normal assistant/system response

## State Shape

The minimal TUI store only needs:

- `startup`
- `accountSummary`
- `transcript`
- `draft`
- `isSubmitting`

Suggested shapes:

- `startup`: `ready`, `degraded`, `warnings`
- `accountSummary`: `activeAccountId`, `mode`
- `transcript`: array of typed entries
- `draft`: string
- `isSubmitting`: boolean

This state can later feed into the fuller `TuiStore` design without conflict.

## Container Integration

The TUI should consume the existing app container from `buildApp()` / `startApp()`.

Required dependencies:

- `chatOrchestrator`
- `sessionContext`
- `reviewService`
- startup status from `startApp()`

The TUI must not build these services itself.

## First Component Set

Suggested first files under `app/src/interface/tui`:

- `App.tsx`
- `components/Header.tsx`
- `components/Transcript.tsx`
- `components/PromptInput.tsx`
- `state/TuiStore.ts`

The first TUI slice does not need full panel decomposition.

## Keyboard Behavior

Initial keyboard behavior should stay minimal:

- Enter: submit
- Ctrl+C: exit

Do not add panel focus switching until the full workspace exists.

## Testing Guidance

First TUI tests should verify:

- startup status appears
- active account summary appears
- user input is appended to transcript
- a structured `ChatReply` renders with the correct style bucket
- clarification results show missing fields
- current draft survives non-submitting rerenders

## Relation To Full TUI Design

This document is a stepping stone.

The future multi-panel workspace should reuse:

- startup state
- transcript model
- structured reply rendering
- account summary data

The minimal TUI should not introduce incompatible reply or store shapes.

## Immediate Implementation Guidance

The next implementation steps should be:

1. add Ink dependencies
2. create a minimal transcript-based `App.tsx`
3. wire it to `startApp()`
4. render `ChatReply` by type
5. keep confirmation as transcript output in the first slice

## Trigger To Pause Development Again

Pause for another design pass if implementation needs:

- interactive confirmation approval flow
- pane focus management
- live market background refresh in the UI
- multiple concurrent detail panes
