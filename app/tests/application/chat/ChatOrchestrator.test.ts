import { describe, expect, it } from 'vitest'

import { ChatOrchestrator } from '../../../src/application/chat/ChatOrchestrator.js'
import { ExecutionWorkflow } from '../../../src/application/execution/ExecutionWorkflow.js'
import { ReviewService } from '../../../src/application/review/ReviewService.js'
import { InMemoryAuditRepository } from '../../../src/infrastructure/persistence/AuditRepository.js'
import { SessionContextService } from '../../../src/application/session/SessionContextService.js'
import type { Account } from '../../../src/domain/account/Account.js'
import { InMemoryTradingStateProvider } from '../../../src/infrastructure/state/InMemoryTradingStateProvider.js'
import type { Position } from '../../../src/domain/trading/Position.js'
import type { OpenOrder } from '../../../src/domain/trading/OpenOrder.js'

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
      allowed_symbols: ['BTC-USDT-SWAP', 'ETH-USDT-SWAP'],
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

function makeExecutionWorkflow() {
  const auditRepository = new InMemoryAuditRepository()

  return new ExecutionWorkflow({
    auditRepository,
    executionAdapter: {
      async execute() {
        return { execution_id: 'exec-1' }
      },
    },
  })
}

function makeReviewService() {
  return new ReviewService(new InMemoryAuditRepository())
}

function makeStateProvider(input?: {
  open_positions?: Position[]
  open_orders?: OpenOrder[]
  realized_daily_loss_usd?: number
}) {
  return new InMemoryTradingStateProvider({
    alpha: {
      open_positions: input?.open_positions ?? [],
      open_orders: input?.open_orders ?? [],
      realized_daily_loss_usd: input?.realized_daily_loss_usd ?? 0,
    },
  })
}

describe('ChatOrchestrator', () => {
  it('refuses execution-capable request when no active account is selected', async () => {
    const orchestrator = new ChatOrchestrator({
      accounts: [makeAccount()],
      sessionContext: new SessionContextService({ defaultAccount: null }),
      executionWorkflow: makeExecutionWorkflow(),
      tradingStateProvider: makeStateProvider(),
      reviewService: makeReviewService(),
    })

    const reply = await orchestrator.handleMessage('open a small BTC long')

    expect(reply.type).toBe('unsupported_request')
    expect(reply.text).toContain('Select an account')
  })

  it('routes an explicit reminder-mode trade request into confirmation flow', async () => {
    const orchestrator = new ChatOrchestrator({
      accounts: [makeAccount({ mode: 'reminder' })],
      sessionContext: new SessionContextService({ defaultAccount: 'alpha' }),
      executionWorkflow: makeExecutionWorkflow(),
      tradingStateProvider: makeStateProvider(),
      reviewService: makeReviewService(),
    })

    const reply = await orchestrator.handleMessage('open btc perp long $100')

    expect(reply.type).toBe('confirmation_required')
    expect(reply.text.toLowerCase()).toContain('requires confirmation')
  })

  it('asks for clarification when size is subjective', async () => {
    const orchestrator = new ChatOrchestrator({
      accounts: [makeAccount({ mode: 'reminder' })],
      sessionContext: new SessionContextService({ defaultAccount: 'alpha' }),
      executionWorkflow: makeExecutionWorkflow(),
      tradingStateProvider: makeStateProvider(),
      reviewService: makeReviewService(),
    })

    const reply = await orchestrator.handleMessage('open a small BTC long')

    expect(reply.type).toBe('clarification_required')
    expect(reply.text.toLowerCase()).toContain('specify an exact order size')
  })

  it('accepts explicit limit orders with protection fields', async () => {
    const orchestrator = new ChatOrchestrator({
      accounts: [makeAccount({ mode: 'reminder' })],
      sessionContext: new SessionContextService({ defaultAccount: 'alpha' }),
      executionWorkflow: makeExecutionWorkflow(),
      tradingStateProvider: makeStateProvider(),
      reviewService: makeReviewService(),
    })

    const reply = await orchestrator.handleMessage('open btc perp long $100 limit at 81200 sl 80500 tp 83000')

    expect(reply.type).toBe('confirmation_required')
  })

  it('returns unsupported_request for bulk cancel wording', async () => {
    const orchestrator = new ChatOrchestrator({
      accounts: [makeAccount({ mode: 'duty_trader' })],
      sessionContext: new SessionContextService({ defaultAccount: 'alpha' }),
      executionWorkflow: makeExecutionWorkflow(),
      tradingStateProvider: makeStateProvider(),
      reviewService: makeReviewService(),
    })

    const reply = await orchestrator.handleMessage('cancel all btc orders')

    expect(reply.type).toBe('unsupported_request')
  })

  it('uses live open-order state for cancel requests', async () => {
    const orchestrator = new ChatOrchestrator({
      accounts: [makeAccount({ mode: 'duty_trader' })],
      sessionContext: new SessionContextService({ defaultAccount: 'alpha' }),
      executionWorkflow: makeExecutionWorkflow(),
      tradingStateProvider: makeStateProvider({
        open_orders: [
          {
            order_id: 'order-42',
            symbol: 'BTC-USDT-SWAP',
            market_type: 'perpetual',
            side: 'buy',
            order_type: 'limit',
            price: 81200,
            quantity: 1,
            status: 'open',
          },
        ],
      }),
      reviewService: makeReviewService(),
    })

    const reply = await orchestrator.handleMessage('cancel btc perp 81200 bid limit')

    expect(reply.type).toBe('execution_result')
    expect(reply.text.toLowerCase()).toContain('executed cancel')
  })

  it('returns review output for explicit proposal review requests', async () => {
    const auditRepository = new InMemoryAuditRepository()
    auditRepository.append({
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

    const orchestrator = new ChatOrchestrator({
      accounts: [makeAccount()],
      sessionContext: new SessionContextService({ defaultAccount: 'alpha' }),
      executionWorkflow: makeExecutionWorkflow(),
      tradingStateProvider: makeStateProvider(),
      reviewService: new ReviewService(auditRepository),
    })

    const reply = await orchestrator.handleMessage('review proposal proposal-1')

    expect(reply.type).toBe('review_result')
    expect(reply.text).toContain('rejected')
  })
})
