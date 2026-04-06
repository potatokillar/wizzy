import React from 'react'
import { describe, expect, it } from 'vitest'
import { render } from 'ink-testing-library'

import { App } from '../../../src/interface/tui/App.js'
import { InMemoryAuditRepository } from '../../../src/infrastructure/persistence/AuditRepository.js'
import { InMemoryTradingStateProvider } from '../../../src/infrastructure/state/InMemoryTradingStateProvider.js'
import { SessionContextService } from '../../../src/application/session/SessionContextService.js'
import { ExecutionWorkflow } from '../../../src/application/execution/ExecutionWorkflow.js'
import { ChatOrchestrator } from '../../../src/application/chat/ChatOrchestrator.js'
import { ReviewService } from '../../../src/application/review/ReviewService.js'
import type { AppStartupResult } from '../../../src/main.js'
import type { Account } from '../../../src/domain/account/Account.js'

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'alpha',
    name: 'Alpha OKX',
    exchange: 'okx',
    enabled: true,
    secret_ref: 'okx-alpha',
    connection_status: 'disconnected',
    mode: 'reminder',
    perpetual_settings: {
      margin_mode: 'cross',
      position_mode: 'one_way',
    },
    execution_permissions: {
      can_open_position: true,
      can_increase_position: true,
      can_reduce_position: true,
      can_close_position: true,
      can_cancel_order: true,
      can_modify_protection_orders: true,
    },
    risk_policy: {
      max_position_notional_usd: 1000,
      max_order_notional_usd: 500,
      max_account_gross_exposure_usd: 2500,
      max_per_trade_loss_usd: 50,
      max_leverage: 3,
      daily_realized_loss_limit_usd: 150,
      allowed_symbols: ['BTC-USDT-SWAP'],
      allowed_market_types: ['perpetual'],
      cooldown_seconds_after_close: 0,
      max_open_positions: 3,
      require_stop_loss_for_new_positions: true,
      allow_overnight_hold: false,
      duty_trader_stop_loss_override: false,
    },
    ...overrides,
  }
}

function makeStartup(): AppStartupResult {
  const auditRepository = new InMemoryAuditRepository()
  const tradingStateProvider = new InMemoryTradingStateProvider()
  const sessionContext = new SessionContextService({ defaultAccount: 'alpha' })
  const executionWorkflow = new ExecutionWorkflow({
    auditRepository,
    executionAdapter: {
      async execute() {
        return { execution_id: 'exec-1' }
      },
    },
  })
  const chatOrchestrator = new ChatOrchestrator({
    accounts: [makeAccount()],
    sessionContext,
    executionWorkflow,
    tradingStateProvider,
    reviewService: new ReviewService(auditRepository),
  })

  return {
    started: true,
    ready: true,
    degraded: false,
    warnings: [],
    app: {
      startedAt: new Date().toISOString(),
      config: {
        app: {
          schema_version: 1,
          market_freshness_ms: 15000,
          default_account: 'alpha',
          session_boundary_utc: '00:00:00Z',
        },
        accounts: [makeAccount()],
        strategies: [],
        ui: {
          schema_version: 1,
          confirm_before_exit: true,
        },
      },
      auditRepository,
      tradingStateProvider,
      sessionContext,
      executionWorkflow,
      chatOrchestrator,
      reviewService: new ReviewService(auditRepository),
    },
  }
}

async function flushTuiUpdate() {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('App', () => {
  it('renders startup and account summary', () => {
    const view = render(<App startup={makeStartup()} interactive={false} />)

    expect(view.lastFrame()).toContain('Wizzy Terminal')
    expect(view.lastFrame()).toContain('Account: alpha')
    expect(view.lastFrame()).toContain('Startup: ready')
  })

  it('submits chat input and appends transcript output', async () => {
    const view = render(
      <App
        startup={makeStartup()}
        interactive={false}
        autoSubmitMessages={['open btc perp long $100']}
      />,
    )
    await flushTuiUpdate()

    expect(view.lastFrame()).toContain('open btc perp long $100')
    expect(view.lastFrame()).toContain('requires confirmation')
  })

  it('renders clarification missing fields', async () => {
    const view = render(
      <App
        startup={makeStartup()}
        interactive={false}
        autoSubmitMessages={['open a small btc long']}
      />,
    )
    await flushTuiUpdate()

    expect(view.lastFrame()).toContain('Specify an exact order size')
    expect(view.lastFrame()).toContain('Missing: size')
  })

  it('renders review output in the transcript', async () => {
    const startup = makeStartup()
    startup.app.auditRepository.append({
      event_id: 'event-1',
      timestamp: '2026-04-06T00:00:00.000Z',
      account_id: 'alpha',
      account_name: 'Alpha OKX',
      proposal_id: 'proposal-1',
      correlation_id: 'corr-1',
      source: 'chat',
      symbol: 'BTC-USDT-SWAP',
      market_type: 'perpetual',
      intent: 'open',
      mode: 'reminder',
      decision: 'rejected',
      reason_code: 'max_order_notional_exceeded',
      reason_human: 'Proposal exceeds the maximum order notional.',
      risk_snapshot_json: '{}',
      execution_snapshot_json: null,
      payload_json: '{}',
    })

    const view = render(
      <App
        startup={startup}
        interactive={false}
        autoSubmitMessages={['review proposal proposal-1']}
      />,
    )

    await flushTuiUpdate()

    expect(view.lastFrame()).toContain('review proposal proposal-1')
    expect(view.lastFrame()).toContain('rejected')
  })
})
