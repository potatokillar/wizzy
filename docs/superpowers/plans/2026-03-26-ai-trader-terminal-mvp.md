# AI Trader Terminal MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first TUI MVP for an AI OKX trader terminal with account-scoped reminder/duty-trader modes, chat-driven workflows, market context, strategy/task runtimes, structured execution, and auditable decisions.

**Architecture:** Build a new TypeScript/Node.js application with clear Interface, Application, Domain, and Infrastructure boundaries. Keep the TUI thin and route all trading behavior through structured services: session context, market context, task/strategy runtimes, proposal generation, risk evaluation, and execution/audit persistence. Use file-based config plus SQLite operational history so the MVP is local-first but ready to grow into remote or multi-interface deployment later.

**Tech Stack:** TypeScript, Node.js 22+, pnpm, Vitest, SQLite (better-sqlite3), Zod, **Ink (React-based TUI)**, `ink-testing-library`, OKX REST/WebSocket client, typed event bus

---

## Proposed File Structure

All application code in this plan lives under the nested code repository: `app/`.

**App root files**
- Create: `app/package.json` — scripts and dependencies
- Create: `app/tsconfig.json` — strict TypeScript configuration
- Create: `app/.gitignore` — ignore `node_modules`, `dist`, `data/db/*.sqlite`, secrets, logs
- Create: `app/vitest.config.ts` — unit/integration test configuration
- Create: `app/src/main.ts` — composition root and process startup

**App configuration and schemas**
- Create: `app/src/config/schema.ts` — Zod schemas for app config, accounts, risk policies, strategies, tasks, UI preferences
- Create: `app/src/infrastructure/secrets/SecretsStore.ts` — centralized secret loading for OKX credentials
- Create: `app/data/secrets/okx-alpha.json.example` — example secret file (never commit real keys)
- Create: `app/src/config/loadConfig.ts` — read/validate JSON config files from `app/data/config`
- Create: `app/src/config/defaultPaths.ts` — canonical paths for config, db, logs, sessions, market cache
- Create: `app/data/config/accounts.json` — sample account config with reminder/duty-trader modes
- Create: `app/data/config/app.json` — app-level config (schema version, market freshness threshold, default account, session boundary)
- Create: `app/data/config/strategies.json` — initial empty or sample strategy config
- Create: `app/data/config/ui.json` — TUI preferences and keyboard settings

**App domain layer**
- Create: `app/src/domain/account/Account.ts` — account model, enabled/disabled state, secret binding, connection status, execution permission flags, and perpetual account settings
- Create: `app/src/domain/risk/RiskPolicy.ts` — risk-policy model and validation helpers
- Create: `app/src/domain/trading/TradeProposal.ts` — canonical proposal shape and intent model
- Create: `app/src/domain/trading/ExecutionDecision.ts` — proposed/confirmed/rejected/executed/failed decision model
- Create: `app/src/domain/trading/Position.ts` — normalized position model for spot/perpetual
- Create: `app/src/domain/trading/OpenOrder.ts` — normalized open-order model
- Create: `app/src/domain/market/MarketSnapshot.ts` — candle/ticker/funding/order-book snapshot types
- Create: `app/src/domain/strategy/Strategy.ts` — strategy definition and normalized runtime metadata shape used by the application layer
- Create: `app/src/domain/task/Task.ts` — task definition and normalized lifecycle model used by the application layer
- Create: `app/src/domain/audit/AuditEvent.ts` — audit event schema and correlation fields

**App application layer**
- Create: `app/src/application/session/SessionContextService.ts`
- Create: `app/src/application/chat/IntentClassifier.ts`
- Create: `app/src/application/chat/ChatOrchestrator.ts`
- Create: `app/src/application/market/MarketContextService.ts`
- Create: `app/src/application/risk/RiskEvaluator.ts`
- Create: `app/src/application/execution/ProposalFactory.ts`
- Create: `app/src/application/execution/ConflictResolver.ts`
- Create: `app/src/application/execution/ExecutionWorkflow.ts`
- Create: `app/src/application/strategy/StrategyRuntime.ts`
- Create: `app/src/application/task/TaskRunner.ts`
- Create: `app/src/application/review/ReviewService.ts`
- Create: `app/src/application/events/EventBus.ts`

**App infrastructure layer**
- Create: `app/src/infrastructure/okx/OkxRestClient.ts`
- Create: `app/src/infrastructure/okx/OkxWsClient.ts`
- Create: `app/src/infrastructure/okx/OkxSymbolMapper.ts`
- Create: `app/src/infrastructure/market/MarketCacheStore.ts`
- Create: `app/src/infrastructure/persistence/Database.ts`
- Create: `app/src/infrastructure/persistence/migrations/001_init.sql`
- Create: `app/src/infrastructure/persistence/AuditRepository.ts`
- Create: `app/src/infrastructure/persistence/StrategyRepository.ts`
- Create: `app/src/infrastructure/persistence/TaskRepository.ts`
- Create: `app/src/infrastructure/persistence/TradingStateRepository.ts`
- Create: `app/src/infrastructure/llm/TraderAgent.ts` — LLM adapter (stubbed in MVP)
- Create: `app/src/infrastructure/logging/logger.ts`

**App TUI layer**
- Create: `app/src/interface/tui/App.tsx` — Ink TUI app
- Create: `app/src/interface/tui/layout/useTerminalLayout.ts`
- Create: `app/src/interface/tui/state/TuiStore.ts`
- Create: `app/src/interface/tui/components/ChatPanel.tsx`
- Create: `app/src/interface/tui/components/AccountPanel.tsx`
- Create: `app/src/interface/tui/components/PositionsOrdersPanel.tsx`
- Create: `app/src/interface/tui/components/WatchMarketPanel.tsx`
- Create: `app/src/interface/tui/components/StrategyTaskPanel.tsx`
- Create: `app/src/interface/tui/components/EventAuditPanel.tsx`
- Create: `app/src/interface/tui/components/ConfirmationPrompt.tsx`
- Create: `app/src/interface/tui/hooks/useKeyboardShortcuts.ts`

**App tests**
- Create: `app/tests/domain/risk/RiskEvaluator.test.ts`
- Create: `app/tests/domain/trading/TradeProposal.test.ts`
- Create: `app/tests/application/execution/ExecutionWorkflow.test.ts`
- Create: `app/tests/application/execution/ConflictResolver.test.ts`
- Create: `app/tests/application/execution/KillSwitchFlow.test.ts`
- Create: `app/tests/application/session/SessionContextService.test.ts`
- Create: `app/tests/application/strategy/StrategyRuntime.test.ts`
- Create: `app/tests/application/task/TaskRunner.test.ts`
- Create: `app/tests/application/review/ReviewService.test.ts`
- Create: `app/tests/infrastructure/persistence/AuditRepository.test.ts`
- Create: `app/tests/infrastructure/secrets/SecretsStore.test.ts`
- Create: `app/tests/infrastructure/okx/OkxSymbolMapper.test.ts`
- Create: `app/tests/application/market/MarketContextService.test.ts`
- Create: `app/tests/infrastructure/okx/OkxRestClient.test.ts`
- Create: `app/tests/interface/tui/layout/useTerminalLayout.test.ts`
- Create: `app/tests/interface/tui/ConfirmationPrompt.test.tsx`

## Commit Policy for This Plan

- If this directory has been initialized as a git repository, treat each commit step below as recommended.
- If this directory is not a git repository, skip commit steps and continue with the implementation/testing steps.
- Every commit step below should be read as **"Commit (optional if git is initialized)"** even where the heading is abbreviated to `Commit`.

## Implementation Notes

- Keep the MVP single-user and local-only. Do not add auth, multi-user state, or remote APIs in this plan.
- Do not build a full backtesting engine in this phase. Strategies should evaluate live/current data only.
- Keep LLM integration behind `TraderAgent` so the rest of the system can be tested with stubs.
- Prefer `market` and `limit` orders only in MVP.
- Hedge mode is out of scope. Perpetual accounts use one-way position mode only.
- The MVP uses **Ink** (React-based TUI). Do not use DOM-based React testing libraries; use `ink-testing-library` for TUI tests.
- If the TUI library becomes a blocker, keep the TUI shell thin and finish domain/application correctness first.

### Task 0: Initialize repository and add base directories

**Files:**
- Create: `docs/` (already exists)
- Create: `data/` (runtime data root)
- Create: `data/config/`
- Create: `data/secrets/`
- Create: `data/db/`
- Create: `data/logs/`
- Create: `data/sessions/`
- Create: `data/market/`
- Create: `data/state/`

- [ ] **Step 1: Ensure this directory is a git repository (optional but recommended)**

Run: `git rev-parse --is-inside-work-tree`
Expected: if it prints `true`, continue.
If it errors, initialize git:

Run: `git init`

- [ ] **Step 2: Create the runtime data directories**

Run: `mkdir -p data/config data/secrets data/db data/logs data/sessions data/market data/state`
Expected: directories exist.

- [ ] **Step 3: Commit (optional)**

```bash
git add data/
git commit -m "chore: add local runtime directory layout"
```

### Task 1: Bootstrap the TypeScript application skeleton

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `vitest.config.ts`
- Create: `src/main.ts`

- [ ] **Step 1: Write the failing bootstrap smoke test**

```ts
// tests/application/bootstrap.test.ts
import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/main'

describe('buildApp', () => {
  it('creates the application container', () => {
    const app = buildApp()
    expect(app).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/application/bootstrap.test.ts`
Expected: FAIL with module or export missing errors because project bootstrap files do not exist yet.

- [ ] **Step 3: Create project package and TypeScript config**

```json
{
  "name": "ai-trader-terminal",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx src/main.ts",
    "build": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "types": ["vitest/globals", "node"]
  }
}
```

- [ ] **Step 4: Implement minimal app bootstrap**

```ts
// src/main.ts
export function buildApp() {
  return { startedAt: new Date().toISOString() }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildApp()
}
```

- [ ] **Step 5: Run bootstrap test to verify it passes**

Run: `pnpm vitest run tests/application/bootstrap.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json .gitignore vitest.config.ts src/main.ts tests/application/bootstrap.test.ts
git commit -m "chore: bootstrap ai trader terminal project"
```

### Task 2: Add config paths and schema-validated config loading

**Files:**
- Create: `src/config/defaultPaths.ts`
- Create: `src/config/schema.ts`
- Create: `src/config/loadConfig.ts`
- Create: `data/config/app.json`
- Create: `data/config/accounts.json`
- Create: `data/config/strategies.json`
- Create: `data/config/ui.json`
- Test: `tests/config/loadConfig.test.ts`

- [ ] **Step 1: Write the failing config-loader test**

```ts
import { describe, expect, it } from 'vitest'
import { loadConfig } from '../../src/config/loadConfig'

describe('loadConfig', () => {
  it('loads and validates app config', () => {
    const config = loadConfig()
    expect(config.app.schema_version).toBe(1)
    expect(config.accounts.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/config/loadConfig.test.ts`
Expected: FAIL because config loader and files do not exist.

- [ ] **Step 3: Create JSON configs with explicit schema_version and sample account**

```json
{
  "schema_version": 1,
  "market_freshness_ms": 15000,
  "default_account": null,
  "session_boundary_utc": "00:00:00Z"
}
```

```json
[
  {
    "id": "alpha",
    "name": "Alpha OKX",
    "exchange": "okx",
    "enabled": true,
    "secret_ref": "okx-alpha",
    "connection_status": "disconnected",
    "mode": "reminder",
    "perpetual_settings": {
      "margin_mode": "cross",
      "position_mode": "one_way"
    },
    "execution_permissions": {
      "can_open_position": true,
      "can_increase_position": true,
      "can_reduce_position": true,
      "can_close_position": true,
      "can_cancel_order": true,
      "can_modify_protection_orders": true
    },
    "risk_policy": {
      "max_position_notional_usd": 1000,
      "max_order_notional_usd": 500,
      "max_account_gross_exposure_usd": 2500,
      "max_per_trade_loss_usd": 50,
      "max_leverage": 3,
      "daily_realized_loss_limit_usd": 150,
      "allowed_symbols": ["BTC-USDT", "ETH-USDT", "BTC-USDT-SWAP", "ETH-USDT-SWAP"],
      "allowed_market_types": ["spot", "perpetual"],
      "cooldown_seconds_after_close": 300,
      "max_open_positions": 3,
      "require_stop_loss_for_new_positions": true,
      "allow_overnight_hold": false,
      "duty_trader_stop_loss_override": false
    }
  }
]
```

- [ ] **Step 4: Implement path helpers, Zod schemas, and secret references**

```ts
export const DATA_ROOT = 'data'
export const CONFIG_ROOT = 'data/config'
```

```ts
export const AppConfigSchema = z.object({
  schema_version: z.literal(1),
  market_freshness_ms: z.number().positive(),
  default_account: z.string().nullable(),
  session_boundary_utc: z.string(),
})
```

Also define `AccountSchema` so that:
- `enabled` is a required boolean
- `secret_ref` is required for exchange-backed accounts
- `connection_status` is an enum such as `disconnected | connecting | connected | error`
- `perpetual_settings.margin_mode` is `cross | isolated`
- `perpetual_settings.position_mode` is `one_way`
- `allowed_symbols` and `allowed_market_types` exist only in `risk_policy` for MVP (single source of truth)
- therefore, `Account` does not have a separate top-level allowlist; it derives allowed scope from its `risk_policy`
- a perpetual-capable account must include `perpetual_settings` and must include `perpetual` in `risk_policy.allowed_market_types`
- each account references a secret record id, for example `secret_ref: "okx-alpha"`

- [ ] **Step 5: Implement `loadConfig()` using the schemas**

```ts
export function loadConfig() {
  return {
    app: AppConfigSchema.parse(readJson('data/config/app.json')),
    accounts: AccountsSchema.parse(readJson('data/config/accounts.json')),
    strategies: StrategiesSchema.parse(readJson('data/config/strategies.json')),
    ui: UiSchema.parse(readJson('data/config/ui.json')),
  }
}
```

- [ ] **Step 6: Run config tests to verify they pass**

Run: `pnpm vitest run tests/config/loadConfig.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/config data/config tests/config/loadConfig.test.ts
git commit -m "feat: add schema-validated local config loading"
```

### Task 2A: Add secret loading abstraction for OKX credentials

**Files:**
- Create: `src/infrastructure/secrets/SecretsStore.ts`
- Create: `data/secrets/okx-alpha.json.example`
- Test: `tests/infrastructure/secrets/SecretsStore.test.ts`

- [ ] **Step 1: Write the failing secrets-store test**

```ts
import { describe, expect, it } from 'vitest'
import { SecretsStore } from '../../../src/infrastructure/secrets/SecretsStore'

describe('SecretsStore', () => {
  it('loads an OKX credential record by secret_ref', () => {
    const store = new SecretsStore('data/secrets')
    const secret = store.loadOkxSecret('okx-alpha')
    expect(secret.passphrase).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/infrastructure/secrets/SecretsStore.test.ts`
Expected: FAIL because secret store does not exist.

- [ ] **Step 3: Add example secret format and loader**

```json
{
  "key": "replace-me",
  "secret": "replace-me",
  "passphrase": "replace-me"
}
```

```ts
export class SecretsStore {
  constructor(private readonly root: string) {}
  loadOkxSecret(secretRef: string) {
    return OkxSecretSchema.parse(readJson(`${this.root}/${secretRef}.json`))
  }
}
```

- [ ] **Step 4: Run secrets tests to verify they pass**

Run: `pnpm vitest run tests/infrastructure/secrets/SecretsStore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit (optional)**

```bash
git add src/infrastructure/secrets data/secrets/okx-alpha.json.example tests/infrastructure/secrets/SecretsStore.test.ts
git commit -m "feat: add local okx secrets loading"
```

### Task 2B: Separate strategy/task definitions from runtime state

**Files:**
- Modify: `src/config/schema.ts`
- Modify: `src/config/loadConfig.ts`
- Create: `src/infrastructure/persistence/StrategyRepository.ts`
- Create: `src/infrastructure/persistence/TaskRepository.ts`
- Test: `tests/config/runtimeStateSplit.test.ts`

- [ ] **Step 1: Write the failing definition-vs-state test**

```ts
import { describe, expect, it } from 'vitest'
import { loadConfig } from '../../src/config/loadConfig'

describe('runtime state split', () => {
  it('loads strategy definitions from config and runtime state from repositories', () => {
    const config = loadConfig()
    expect(Array.isArray(config.strategies)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails or is incomplete**

Run: `pnpm vitest run tests/config/runtimeStateSplit.test.ts`
Expected: FAIL until the plan’s storage split is implemented.

- [ ] **Step 3: Define the ownership boundary explicitly in code**

Rules to implement:
- `data/config/strategies.json` stores strategy definitions only
- user-created ad hoc tasks are persisted in SQLite only
- `StrategyRepository` stores runtime state only (status, timestamps, last result, next run)
- `TaskRepository` stores task runtime state and history only

- [ ] **Step 4: Run split-boundary tests to verify they pass**

Run: `pnpm vitest run tests/config/runtimeStateSplit.test.ts`
Expected: PASS

- [ ] **Step 5: Commit (optional)**

```bash
git add src/config src/infrastructure/persistence tests/config/runtimeStateSplit.test.ts
git commit -m "feat: separate config definitions from runtime state"
```

### Task 3: Model core domain objects and proposal schema

**Files:**
- Create: `src/domain/account/Account.ts`
- Create: `src/domain/risk/RiskPolicy.ts`
- Create: `src/domain/trading/TradeProposal.ts`
- Create: `src/domain/trading/ExecutionDecision.ts`
- Create: `src/domain/trading/Position.ts`
- Create: `src/domain/trading/OpenOrder.ts`
- Create: `src/domain/market/MarketSnapshot.ts`
- Create: `src/domain/strategy/Strategy.ts`
- Create: `src/domain/task/Task.ts`
- Create: `src/domain/audit/AuditEvent.ts`
- Test: `tests/domain/trading/TradeProposal.test.ts`

- [ ] **Step 1: Write the failing trade-proposal test**

```ts
import { describe, expect, it } from 'vitest'
import { createProposal } from '../../../src/domain/trading/TradeProposal'

describe('createProposal', () => {
  it('creates a proposal with proposal_id and provenance', () => {
    const proposal = createProposal({
      account: 'alpha',
      symbol: 'BTC-USDT-SWAP',
      market_type: 'perpetual',
      intent: 'open',
      side: 'buy',
      order_type: 'market',
      size: { type: 'notional_usd', value: 100 },
      provenance: 'chat',
    })

    expect(proposal.proposal_id).toBeTruthy()
    expect(proposal.provenance).toBe('chat')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/domain/trading/TradeProposal.test.ts`
Expected: FAIL because trade proposal domain model does not exist.

- [ ] **Step 3: Define strongly typed domain entities**

```ts
export type MarginMode = 'cross' | 'isolated'
export type PositionMode = 'one_way'
export type ProposalIntent = 'open' | 'increase' | 'reduce' | 'close' | 'cancel' | 'modify_protection'
export type ProposalSource = 'chat' | 'strategy' | 'task' | 'protective_automation'
```

Ensure `Account` includes optional `perpetual_settings` that become required whenever `risk_policy.allowed_market_types` contains `perpetual`.

- [ ] **Step 4: Implement `createProposal()` and supporting types**

```ts
export function createProposal(input: CreateProposalInput): TradeProposal {
  return {
    proposal_id: crypto.randomUUID(),
    ...input,
    created_at: new Date().toISOString(),
  }
}
```

- [ ] **Step 5: Run domain tests to verify they pass**

Run: `pnpm vitest run tests/domain/trading/TradeProposal.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/domain tests/domain/trading/TradeProposal.test.ts
git commit -m "feat: add core trading domain models"
```

### Task 4: Implement risk evaluation rules from the spec

**Files:**
- Create: `src/application/risk/RiskEvaluator.ts`
- Test: `tests/domain/risk/RiskEvaluator.test.ts`

- [ ] **Step 1: Write the failing risk-evaluator tests**

```ts
import { describe, expect, it } from 'vitest'
import { evaluateRisk } from '../../../src/application/risk/RiskEvaluator'

describe('evaluateRisk', () => {
  it('rejects risk-increasing proposal when max_order_notional_usd is exceeded', () => {
    const result = evaluateRisk({
      account: makeAccount(),
      proposal: makeProposal({ size: { type: 'notional_usd', value: 1000 } }),
      openPositions: [],
      realizedDailyLossUsd: 0,
    })

    expect(result.ok).toBe(false)
    expect(result.reason_code).toBe('max_order_notional_exceeded')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/domain/risk/RiskEvaluator.test.ts`
Expected: FAIL because evaluator does not exist.

- [ ] **Step 3: Implement minimal evaluator rules from the spec**

```ts
if (proposalNotionalUsd > policy.max_order_notional_usd) {
  return { ok: false, reason_code: 'max_order_notional_exceeded' }
}
```

Also implement checks for:
- missing/invalid risk config
- duty-trader config invalid when `allowed_symbols` is empty
- duty-trader config invalid when `require_stop_loss_for_new_positions` is `false` and `duty_trader_stop_loss_override` is not `true`
- daily realized loss limit
- allowed symbol
- allowed market type
- `max_order_notional_usd`
- `max_position_notional_usd`
- `max_per_trade_loss_usd`
- session-boundary enforcement when `allow_overnight_hold` is `false`
- max leverage
- max open positions
- gross exposure
- cooldown after close
- stop-loss required for new duty-trader positions

- [ ] **Step 4: Add passing tests for each rejection branch and one acceptance branch**

Run: `pnpm vitest run tests/domain/risk/RiskEvaluator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/application/risk/RiskEvaluator.ts tests/domain/risk/RiskEvaluator.test.ts
 git commit -m "feat: enforce account risk policy evaluation"
```

### Task 5: Implement session context and account switching rules

**Files:**
- Create: `src/application/session/SessionContextService.ts`
- Test: `tests/application/session/SessionContextService.test.ts`

- [ ] **Step 1: Write the failing session-context tests**

```ts
import { describe, expect, it } from 'vitest'
import { SessionContextService } from '../../../src/application/session/SessionContextService'

describe('SessionContextService', () => {
  it('starts with no active account when default is null', () => {
    const service = new SessionContextService({ defaultAccount: null })
    expect(service.getActiveAccount()).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/application/session/SessionContextService.test.ts`
Expected: FAIL because service is missing.

- [ ] **Step 3: Implement account-selection and switching service**

```ts
export class SessionContextService {
  #activeAccountId: string | null
  constructor(input: { defaultAccount: string | null }) {
    this.#activeAccountId = input.defaultAccount
  }
  getActiveAccount() { return this.#activeAccountId }
  switchAccount(accountId: string) { this.#activeAccountId = accountId }
}
```

Include helpers that answer whether execution-capable flows are allowed without an active account.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/application/session/SessionContextService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/application/session/SessionContextService.ts tests/application/session/SessionContextService.test.ts
git commit -m "feat: add session account context management"
```

### Task 6: Add SQLite bootstrap and repositories for durable state

**Files:**
- Create: `src/infrastructure/persistence/Database.ts`
- Create: `src/infrastructure/persistence/migrations/001_init.sql`
- Create: `src/infrastructure/persistence/AuditRepository.ts`
- Create: `src/infrastructure/persistence/StrategyRepository.ts`
- Create: `src/infrastructure/persistence/TaskRepository.ts`
- Create: `src/infrastructure/persistence/TradingStateRepository.ts`
- Test: `tests/infrastructure/persistence/AuditRepository.test.ts`

- [ ] **Step 1: Write the failing repository smoke test**

```ts
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../../../src/infrastructure/persistence/Database'

describe('createDatabase', () => {
  it('creates the audit_events table', () => {
    const db = createDatabase(':memory:')
    const row = db.prepare("select name from sqlite_master where type='table' and name='audit_events'").get()
    expect(row).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/infrastructure/persistence/AuditRepository.test.ts`
Expected: FAIL because DB bootstrap does not exist.

- [ ] **Step 3: Add migration and minimal DB bootstrap**

```sql
create table audit_events (
  event_id text primary key,
  timestamp text not null,
 account_id text not null,
  account_name text not null,
  session_id text not null,
  correlation_id text not null,
  proposal_id text,
  source text not null,
  symbol text,
  market_type text,
  intent text,
  mode text not null,
  decision text not null,
  reason_code text,
  reason_human text,
  risk_snapshot_json text not null,
  execution_snapshot_json text,
  payload_json text not null
);
```

- [ ] **Step 4: Implement repositories for audit, strategy, and task persistence**

Focus on write/read methods needed by later tasks.

- [ ] **Step 5: Run persistence tests to verify they pass**

Run: `pnpm vitest run tests/infrastructure/persistence/AuditRepository.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/persistence tests/infrastructure/persistence/AuditRepository.test.ts
git commit -m "feat: add sqlite persistence for audit and runtime state"
```

### Task 7: Implement audit event writing and narrative review support

**Files:**
- Modify: `src/domain/audit/AuditEvent.ts`
- Modify: `src/infrastructure/persistence/AuditRepository.ts`
- Create: `src/application/review/ReviewService.ts`
- Test: `tests/application/review/ReviewService.test.ts`

- [ ] **Step 1: Write the failing review-service test**

```ts
import { describe, expect, it } from 'vitest'
import { ReviewService } from '../../../src/application/review/ReviewService'

describe('ReviewService', () => {
  it('builds a chronological narrative for a proposal correlation id', async () => {
    const review = await new ReviewService(fakeAuditRepository()).reviewProposal('corr-1')
    expect(review).toContain('rejected')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/application/review/ReviewService.test.ts`
Expected: FAIL because review service does not exist.

- [ ] **Step 3: Implement audit event helpers and review service**

```ts
return events
  .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  .map((event) => `${event.timestamp} ${event.decision} ${event.reason_human ?? ''}`)
  .join('\n')
```

- [ ] **Step 4: Run review tests to verify they pass**

Run: `pnpm vitest run tests/application/review/ReviewService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/audit src/application/review src/infrastructure/persistence/AuditRepository.ts tests/application/review/ReviewService.test.ts
git commit -m "feat: add auditable review narratives"
```

### Task 8: Implement market snapshot models and symbol normalization

**Files:**
- Create: `src/infrastructure/okx/OkxSymbolMapper.ts`
- Create: `src/domain/market/MarketSnapshot.ts`
- Test: `tests/infrastructure/okx/OkxSymbolMapper.test.ts`

- [ ] **Step 1: Write the failing symbol-normalization tests**

```ts
import { describe, expect, it } from 'vitest'
import { normalizeSymbol } from '../../../src/infrastructure/okx/OkxSymbolMapper'

describe('normalizeSymbol', () => {
  it('maps btc perp to BTC-USDT-SWAP', () => {
    expect(normalizeSymbol('btc perp')).toBe('BTC-USDT-SWAP')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/infrastructure/okx/OkxSymbolMapper.test.ts`
Expected: FAIL because symbol mapper does not exist.

- [ ] **Step 3: Implement canonical symbol mapping and market snapshot types**

```ts
export function normalizeSymbol(input: string): string {
  const value = input.trim().toUpperCase()
  if (value === 'BTC PERP' || value === 'BTC-PERP') return 'BTC-USDT-SWAP'
  return value.replace('/', '-')
}
```

- [ ] **Step 4: Run mapper tests to verify they pass**

Run: `pnpm vitest run tests/infrastructure/okx/OkxSymbolMapper.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/okx/OkxSymbolMapper.ts src/domain/market/MarketSnapshot.ts tests/infrastructure/okx/OkxSymbolMapper.test.ts
git commit -m "feat: normalize okx instruments and market snapshots"
```

### Task 9: Implement market context service with freshness gating and MVP data minimums

**Files:**
- Create: `src/infrastructure/market/MarketCacheStore.ts`
- Create: `src/application/market/MarketContextService.ts`
- Test: `tests/application/market/MarketContextService.test.ts`

- [ ] **Step 1: Write the failing market-context tests**

```ts
import { describe, expect, it } from 'vitest'
import { MarketContextService } from '../../../src/application/market/MarketContextService'

describe('MarketContextService', () => {
  it('marks snapshots stale when freshness threshold is exceeded', async () => {
    const service = new MarketContextService(fakeSource(), { marketFreshnessMs: 1000 })
    const context = await service.getWatchlistContext(['BTC-USDT-SWAP'])
    expect(context[0].is_stale).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/application/market/MarketContextService.test.ts`
Expected: FAIL because service does not exist.

- [ ] **Step 3: Implement freshness-aware market context service**

The service must also enforce these MVP minimums from the spec:
- support candle intervals `1m`, `5m`, `15m`, `1h`, `4h`, `1d`
- request up to 500 candles for indicator calculations when available
- refresh watchlist summaries at least every 5 seconds while active
- provide one consistent snapshot bundle per evaluation cycle

- [ ] **Step 4: Run market-context tests to verify they pass**

Run: `pnpm vitest run tests/application/market/MarketContextService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/application/market src/infrastructure/market tests/application/market/MarketContextService.test.ts
git commit -m "feat: add freshness-aware market context service"
```

### Task 10: Implement conflict resolution and unified execution workflow

**Files:**
- Create: `src/application/execution/ProposalFactory.ts`
- Create: `src/application/execution/ConflictResolver.ts`
- Create: `src/application/execution/ExecutionWorkflow.ts`
- Test: `tests/application/execution/ConflictResolver.test.ts`
- Test: `tests/application/execution/ExecutionWorkflow.test.ts`

- [ ] **Step 1: Write the failing conflict-resolver and execution-workflow tests**

```ts
import { describe, expect, it } from 'vitest'
import { ConflictResolver } from '../../../src/application/execution/ConflictResolver'

describe('ConflictResolver', () => {
  it('rejects a second active risk-increasing proposal for the same account and symbol', () => {
    const resolver = new ConflictResolver()
    resolver.registerActive(makeProposal({ proposal_id: 'p1' }))
    const result = resolver.check(makeProposal({ proposal_id: 'p2' }))
    expect(result.ok).toBe(false)
  })
})
```

```ts
import { describe, expect, it } from 'vitest'
import { ExecutionWorkflow } from '../../../src/application/execution/ExecutionWorkflow'

describe('ExecutionWorkflow', () => {
  it('returns confirmation_required for a risk-increasing proposal in reminder mode', async () => {
    const workflow = makeWorkflow({ mode: 'reminder' })
    const result = await workflow.run(makeProposal())
    expect(result.status).toBe('confirmation_required')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/application/execution/ConflictResolver.test.ts tests/application/execution/ExecutionWorkflow.test.ts`
Expected: FAIL because workflow classes do not exist.

- [ ] **Step 3: Implement `ConflictResolver` and `ExecutionWorkflow`**

The workflow must:
- create proposal IDs if missing
- run conflict checks
- allow risk-reducing actions (`reduce`, `close`, `modify_protection`) to preempt one active risk-increasing proposal for the same account+symbol
- run permission checks
- run risk checks
- reject risk-increasing auto-execution when market context is stale beyond the configured threshold
- branch to confirmation-required for reminder-mode risk-increasing actions
- auto-execute permitted risk-reducing actions in reminder mode
- auto-execute permitted actions in duty-trader mode
- for spot positions, if native attached protective orders are unavailable, create and audit a follow-up protective-order task instead of silently skipping protection
- write audit events on each branch

- [ ] **Step 4: Run workflow tests to verify they pass**

Run: `pnpm vitest run tests/application/execution/ConflictResolver.test.ts tests/application/execution/ExecutionWorkflow.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/application/execution tests/application/execution
git commit -m "feat: add unified execution workflow"
```

### Task 10A: Add user-initiated flatten and kill-switch flows

**Files:**
- Modify: `src/application/chat/IntentClassifier.ts`
- Modify: `src/application/chat/ChatOrchestrator.ts`
- Modify: `src/application/execution/ExecutionWorkflow.ts`
- Create: `tests/application/execution/KillSwitchFlow.test.ts`

- [ ] **Step 1: Write the failing kill-switch test**

```ts
import { describe, expect, it } from 'vitest'
import { ChatOrchestrator } from '../../../src/application/chat/ChatOrchestrator'

describe('Kill-switch flow', () => {
  it('activates account kill-switch and blocks new auto-execution', async () => {
    const orchestrator = new ChatOrchestrator(makeDeps({ mode: 'duty_trader' }))
    const reply = await orchestrator.handleMessage('activate kill switch on this account')
    expect(reply.text.toLowerCase()).toContain('kill switch')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/application/execution/KillSwitchFlow.test.ts`
Expected: FAIL because kill-switch handling does not exist.

- [ ] **Step 3: Implement user-initiated flatten and kill-switch intents**

MVP behavior rules:
- `flatten` means immediately submit risk-reducing close actions for all open positions on the active account and cancel open orders where supported
- `kill switch` means set an account-scoped runtime flag that blocks all new risk-increasing auto-execution, pauses strategy runtime on that account, pauses active tasks on that account, and optionally cancels resting open orders
- both actions are user-triggered only, never autonomous
- both actions still require explicit account context
- both actions must write audit events with source `chat` and explicit emergency reason text
- kill-switch remains active until the user explicitly clears it in chat

- [ ] **Step 4: Run kill-switch tests to verify they pass**

Run: `pnpm vitest run tests/application/execution/KillSwitchFlow.test.ts`
Expected: PASS

- [ ] **Step 5: Commit (optional if git is initialized)**

```bash
git add src/application/chat src/application/execution tests/application/execution/KillSwitchFlow.test.ts
git commit -m "feat: add user-initiated emergency flatten flow"
```

### Task 11: Add strategy runtime with durable restart behavior

**Files:**
- Create: `src/application/strategy/StrategyRuntime.ts`
- Modify: `src/infrastructure/persistence/StrategyRepository.ts`
- Test: `tests/application/strategy/StrategyRuntime.test.ts`

- [ ] **Step 1: Write the failing strategy-runtime tests**

```ts
import { describe, expect, it } from 'vitest'
import { StrategyRuntime } from '../../../src/application/strategy/StrategyRuntime'

describe('StrategyRuntime', () => {
  it('reloads enabled strategies on startup and records downtime gap event', async () => {
    const runtime = new StrategyRuntime(makeDeps())
    await runtime.resumeEnabledStrategies()
    expect(runtime.listActive()).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/application/strategy/StrategyRuntime.test.ts`
Expected: FAIL because runtime does not exist.

- [ ] **Step 3: Implement strategy scheduling and persistence-aware resume**

Include:
- load enabled strategies
- compute next evaluation time
- record downtime gap events instead of replaying missed ticks
- emit proposals or alerts through the event bus

- [ ] **Step 4: Run strategy-runtime tests to verify they pass**

Run: `pnpm vitest run tests/application/strategy/StrategyRuntime.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/application/strategy src/infrastructure/persistence/StrategyRepository.ts tests/application/strategy/StrategyRuntime.test.ts
git commit -m "feat: add durable strategy runtime"
```

### Task 12: Add task runner with expiry and restart semantics

**Files:**
- Create: `src/application/task/TaskRunner.ts`
- Modify: `src/infrastructure/persistence/TaskRepository.ts`
- Test: `tests/application/task/TaskRunner.test.ts`

- [ ] **Step 1: Write the failing task-runner tests**

```ts
import { describe, expect, it } from 'vitest'
import { TaskRunner } from '../../../src/application/task/TaskRunner'

describe('TaskRunner', () => {
  it('resumes active non-expired tasks after restart', async () => {
    const runner = new TaskRunner(makeDeps())
    await runner.resumeActiveTasks()
    expect(runner.listActive()).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/application/task/TaskRunner.test.ts`
Expected: FAIL because runner does not exist.

- [ ] **Step 3: Implement task creation, expiration, resume, and restart events**

Include:
- create task from normalized request
- store status, expiry, last evaluation time, result summary
- skip expired tasks on resume
- emit restart event for resumed active tasks

- [ ] **Step 4: Run task-runner tests to verify they pass**

Run: `pnpm vitest run tests/application/task/TaskRunner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/application/task src/infrastructure/persistence/TaskRepository.ts tests/application/task/TaskRunner.test.ts
git commit -m "feat: add durable task runner"
```

### Task 13: Implement chat intent classification and orchestrator skeleton

**Files:**
- Create: `src/application/chat/IntentClassifier.ts`
- Create: `src/application/chat/ChatOrchestrator.ts`
- Test: `tests/application/chat/IntentClassifier.test.ts`
- Test: `tests/application/chat/ChatOrchestrator.test.ts`

- [ ] **Step 1: Write the failing intent-classifier and orchestrator tests**

```ts
import { describe, expect, it } from 'vitest'
import { classifyIntent } from '../../../src/application/chat/IntentClassifier'

describe('classifyIntent', () => {
  it('classifies switch-account as account_control', () => {
    expect(classifyIntent('switch to alpha account')).toBe('account_control')
  })
})
```

```ts
import { describe, expect, it } from 'vitest'
import { ChatOrchestrator } from '../../../src/application/chat/ChatOrchestrator'

describe('ChatOrchestrator', () => {
  it('refuses execution-capable request when no active account is selected', async () => {
    const orchestrator = new ChatOrchestrator(makeDeps({ activeAccount: null }))
    const reply = await orchestrator.handleMessage('open a small BTC long')
    expect(reply.text).toContain('select an account')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/application/chat/IntentClassifier.test.ts tests/application/chat/ChatOrchestrator.test.ts`
Expected: FAIL because classifier/orchestrator do not exist.

- [ ] **Step 3: Implement minimal classifier and orchestrator routing**

Support these branches:
- account control
- market understanding
- trade action
- task delegation
- review and audit

The orchestrator may stub strategy-management replies for now if needed, but must route trade actions into `ExecutionWorkflow`.

- [ ] **Step 4: Run chat tests to verify they pass**

Run: `pnpm vitest run tests/application/chat/IntentClassifier.test.ts tests/application/chat/ChatOrchestrator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/application/chat tests/application/chat
git commit -m "feat: add chat workflow orchestration skeleton"
```

### Task 14: Implement typed event bus and app composition root

**Files:**
- Create: `src/application/events/EventBus.ts`
- Modify: `src/main.ts`
- Test: `tests/application/bootstrap.test.ts`

- [ ] **Step 1: Write the failing composition test for wired services**

```ts
import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/main'

describe('buildApp', () => {
  it('wires core services needed by the TUI', () => {
    const app = buildApp()
    expect(app.chatOrchestrator).toBeDefined()
    expect(app.eventBus).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/application/bootstrap.test.ts`
Expected: FAIL because buildApp still returns a trivial object.

- [ ] **Step 3: Implement event bus and full app container wiring**

Wire together:
- config loader
- DB bootstrap
- repositories
- session context service
- market context service
- risk evaluator
- execution workflow
- task runner
- strategy runtime
- chat orchestrator
- event bus

- [ ] **Step 4: Run bootstrap test to verify it passes**

Run: `pnpm vitest run tests/application/bootstrap.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/application/events/EventBus.ts src/main.ts tests/application/bootstrap.test.ts
git commit -m "feat: wire application services into app container"
```

### Task 15: Implement terminal layout rules and resize gating

**Files:**
- Create: `src/interface/tui/layout/useTerminalLayout.ts`
- Test: `tests/interface/tui/layout/useTerminalLayout.test.ts`

- [ ] **Step 1: Write the failing layout tests**

```ts
import { describe, expect, it } from 'vitest'
import { resolveLayout } from '../../../../src/interface/tui/layout/useTerminalLayout'

describe('resolveLayout', () => {
  it('returns multi_panel at 140x36', () => {
    expect(resolveLayout({ columns: 140, rows: 36 }).mode).toBe('multi_panel')
  })

  it('returns resize_required below 100x28', () => {
    expect(resolveLayout({ columns: 99, rows: 27 }).mode).toBe('resize_required')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/interface/tui/layout/useTerminalLayout.test.ts`
Expected: FAIL because layout resolver does not exist.

- [ ] **Step 3: Implement layout resolver from the spec**

```ts
if (columns >= 140 && rows >= 36) return { mode: 'multi_panel' }
if (columns >= 100 && rows >= 28) return { mode: 'degraded_two_zone' }
return { mode: 'resize_required' }
```

- [ ] **Step 4: Run layout tests to verify they pass**

Run: `pnpm vitest run tests/interface/tui/layout/useTerminalLayout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/interface/tui/layout tests/interface/tui/layout
git commit -m "feat: enforce terminal layout breakpoints"
```

### Task 16: Build the confirmation prompt and TUI store primitives

**Files:**
- Create: `src/interface/tui/state/TuiStore.ts`
- Create: `src/interface/tui/components/ConfirmationPrompt.tsx`
- Test: `tests/interface/tui/ConfirmationPrompt.test.tsx`

- [ ] **Step 1: Write the failing confirmation-prompt test**

```tsx
import React from 'react'
import { describe, expect, it } from 'vitest'
import { render } from 'ink-testing-library'
import { ConfirmationPrompt } from '../../../src/interface/tui/components/ConfirmationPrompt'

describe('ConfirmationPrompt', () => {
  it('renders account name and action summary', () => {
    const view = render(
      <ConfirmationPrompt
        open
        proposal={{ account: 'alpha', symbol: 'BTC-USDT-SWAP', intent: 'open' }}
      />,
    )
    expect(view.lastFrame()).toContain('alpha')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/interface/tui/ConfirmationPrompt.test.tsx`
Expected: FAIL because prompt component does not exist.

- [ ] **Step 3: Implement TUI store and confirmation prompt**

Prompt must show:
- account name
- mode
- symbol
- intent
- stop-loss summary if present
- confirm/cancel hints

- [ ] **Step 4: Run prompt tests to verify they pass**

Run: `pnpm vitest run tests/interface/tui/ConfirmationPrompt.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/interface/tui/state src/interface/tui/components/ConfirmationPrompt.tsx tests/interface/tui/ConfirmationPrompt.test.tsx
git commit -m "feat: add tui confirmation prompt primitives"
```

### Task 17: Build the panel components and keyboard-focus behavior

**Files:**
- Create: `src/interface/tui/hooks/useKeyboardShortcuts.ts`
- Create: `src/interface/tui/components/ChatPanel.tsx`
- Create: `src/interface/tui/components/AccountPanel.tsx`
- Create: `src/interface/tui/components/PositionsOrdersPanel.tsx`
- Create: `src/interface/tui/components/WatchMarketPanel.tsx`
- Create: `src/interface/tui/components/StrategyTaskPanel.tsx`
- Create: `src/interface/tui/components/EventAuditPanel.tsx`
- Create: `src/interface/tui/App.tsx`
- Test: `tests/interface/tui/App.test.tsx`

- [ ] **Step 1: Write the failing TUI app render test**

```tsx
import React from 'react'
import { describe, expect, it } from 'vitest'
import { render } from 'ink-testing-library'
import { App } from '../../../src/interface/tui/App'

describe('App', () => {
  it('renders the core panel headings in multi-panel mode', () => {
    const view = render(<App initialSize={{ columns: 140, rows: 36 }} />)
    expect(view.lastFrame()).toContain('Chat')
    expect(view.lastFrame()).toContain('Account')
    expect(view.lastFrame()).toContain('Event / Audit')
  })

  it('preserves input focus across background refreshes', async () => {
    const view = render(<App initialSize={{ columns: 140, rows: 36 }} />)
    view.stdin.write('open a ')
    await Promise.resolve()
    expect(view.lastFrame()).toContain('open a ')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/interface/tui/App.test.tsx`
Expected: FAIL because TUI app and panels do not exist.

- [ ] **Step 3: Implement the multi-panel workspace and keyboard navigation**

Support:
- multi-panel layout
- degraded-two-zone fallback
- focus switching shortcuts
- resize-required screen
- feed state from `TuiStore`
- preserve current text-input focus across panel refreshes and background state updates

- [ ] **Step 4: Run TUI tests to verify they pass**

Run: `pnpm vitest run tests/interface/tui/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/interface/tui tests/interface/tui/App.test.tsx
git commit -m "feat: add multi-panel trader terminal ui"
```

### Task 18: Connect chat input to orchestrator and confirmation flow

**Files:**
- Modify: `src/interface/tui/App.tsx`
- Modify: `src/interface/tui/components/ChatPanel.tsx`
- Modify: `src/interface/tui/state/TuiStore.ts`
- Modify: `src/application/chat/ChatOrchestrator.ts`
- Modify: `src/application/execution/ExecutionWorkflow.ts`
- Test: `tests/interface/tui/ChatFlow.test.tsx`

- [ ] **Step 1: Write the failing chat-flow integration test**

```tsx
import React from 'react'
import { describe, expect, it } from 'vitest'
import { render } from 'ink-testing-library'
import { App } from '../../../src/interface/tui/App'

describe('Chat flow', () => {
  it('shows a confirmation prompt for reminder-mode risk-increasing trade requests', async () => {
    const view = render(<App initialSize={{ columns: 140, rows: 36 }} />)
    view.stdin.write('open a small BTC long\n')
    await Promise.resolve()
    expect(view.lastFrame()?.toLowerCase()).toContain('confirm')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/interface/tui/ChatFlow.test.tsx`
Expected: FAIL because panels are not wired to orchestrator/workflow yet.

- [ ] **Step 3: Wire chat submission into `ChatOrchestrator` and `TuiStore`**

The flow must:
- send text input to orchestrator
- append trader-style replies to Chat Panel
- ensure every execution proposal and every execution result rendered in chat includes the target account name and current mode
- surface pending confirmation state into `ConfirmationPrompt`
- reflect audit/execution events in Event / Audit Panel

- [ ] **Step 4: Run chat-flow tests to verify they pass**

Run: `pnpm vitest run tests/interface/tui/ChatFlow.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/interface/tui src/application/chat src/application/execution tests/interface/tui/ChatFlow.test.tsx
git commit -m "feat: connect chat workflows to execution confirmation ui"
```

### Task 19: Add OKX integration adapters behind interfaces

**Files:**
- Create: `src/infrastructure/okx/OkxRestClient.ts`
- Create: `src/infrastructure/okx/OkxWsClient.ts`
- Modify: `src/application/market/MarketContextService.ts`
- Modify: `src/application/execution/ExecutionWorkflow.ts`
- Test: `tests/infrastructure/okx/OkxRestClient.test.ts`

- [ ] **Step 1: Write the failing OKX client contract test**

```ts
import { describe, expect, it } from 'vitest'
import { OkxRestClient } from '../../../src/infrastructure/okx/OkxRestClient'

describe('OkxRestClient', () => {
  it('builds canonical place-order payloads for perpetual market orders', () => {
    const client = new OkxRestClient({ key: 'k', secret: 's', passphrase: 'p' })
    const payload = client.buildPlaceOrderPayload({
      instId: 'BTC-USDT-SWAP',
      tdMode: 'cross',
      side: 'buy',
      ordType: 'market',
      sz: '1',
    })
    expect(payload.instId).toBe('BTC-USDT-SWAP')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/infrastructure/okx/OkxRestClient.test.ts`
Expected: FAIL because OKX adapter does not exist.

- [ ] **Step 3: Implement thin OKX adapter methods needed by MVP**

Support:
- fetch watchlist ticker snapshots
- fetch candles/funding
- place order payload building
- cancel order payload building
- set leverage request building

Use interfaces so tests can stub network behavior.

- [ ] **Step 4: Run OKX adapter tests to verify they pass**

Run: `pnpm vitest run tests/infrastructure/okx/OkxRestClient.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/okx tests/infrastructure/okx/OkxRestClient.test.ts
git commit -m "feat: add okx market and execution adapters"
```

### Task 20: Add startup flow that resumes strategies/tasks and launches the TUI

**Files:**
- Modify: `src/main.ts`
- Modify: `src/interface/tui/App.tsx`
- Modify: `src/application/strategy/StrategyRuntime.ts`
- Modify: `src/application/task/TaskRunner.ts`
- Test: `tests/application/startup/StartupFlow.test.ts`

- [ ] **Step 1: Write the failing startup-flow test**

```ts
import { describe, expect, it } from 'vitest'
import { startApp } from '../../../src/main'

describe('startApp', () => {
  it('resumes durable runtimes before starting the interface', async () => {
    const app = await startApp()
    expect(app.started).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/application/startup/StartupFlow.test.ts`
Expected: FAIL because runtime startup is incomplete.

- [ ] **Step 3: Implement startup sequencing**

Sequence:
1. load config
2. bootstrap DB
3. create service container
4. resume strategies
5. resume active tasks
6. start market watchers
7. render TUI

- [ ] **Step 4: Run startup-flow test to verify it passes**

Run: `pnpm vitest run tests/application/startup/StartupFlow.test.ts`
Expected: PASS

- [ ] **Step 5: Run focused verification for the MVP slice**

Run: `pnpm test`
Expected: PASS for all tests added in this plan.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts src/interface/tui/App.tsx src/application/strategy src/application/task tests/application/startup/StartupFlow.test.ts
git commit -m "feat: start trader terminal with resumable runtimes"
```

## Final Verification Checklist

- [ ] Run: `pnpm test`
- [ ] Run: `pnpm build`
- [ ] Verify config loads from `data/config/*.json`
- [ ] Verify TUI layout mode changes at 140x36 and 100x28 boundaries
- [ ] Verify reminder-mode trade requests show confirmation
- [ ] Verify duty-trader mode can auto-execute a permitted mock proposal
- [ ] Verify stale market data blocks new risk-increasing auto-execution
- [ ] Verify audit review can explain why a proposal was rejected or executed
- [ ] Verify strategies and tasks resume after restart using persisted state
- [ ] Verify TUI background refresh does not disrupt current text entry focus
- [ ] Verify session-boundary rules prevent overnight holds when `allow_overnight_hold` is false

## Skills to Reference During Execution

- Use `@superpowers:subagent-driven-development` to execute this plan task-by-task with fresh subagents and review checkpoints.
- Use `@superpowers:test-driven-development` before implementing each behavior slice.
- Use `@superpowers:verification-before-completion` before claiming the MVP slice is complete.
- Use `@superpowers:requesting-code-review` after major implementation milestones.
