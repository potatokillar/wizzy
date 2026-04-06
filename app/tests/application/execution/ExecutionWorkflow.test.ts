import { describe, expect, it } from 'vitest'

import { ExecutionWorkflow } from '../../../src/application/execution/ExecutionWorkflow.js'
import { InMemoryAuditRepository } from '../../../src/infrastructure/persistence/AuditRepository.js'
import type { Account } from '../../../src/domain/account/Account.js'
import { createProposal } from '../../../src/domain/trading/TradeProposal.js'
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

function makeProposal() {
  return createProposal({
    account_id: 'alpha',
    account_name: 'Alpha OKX',
    symbol: 'BTC-USDT-SWAP',
    market_type: 'perpetual',
    intent: 'open',
    side: 'buy',
    order_type: 'market',
    size: { type: 'notional_usd', value: 100 },
    provenance: 'chat',
    rationale_summary: 'Probe long after reclaim.',
    stop_loss: {
      kind: 'stop_loss',
      trigger_price: 81000,
    },
    leverage: 2,
  })
}

function makePosition(overrides: Partial<Position> = {}): Position {
  return {
    symbol: 'BTC-USDT-SWAP',
    market_type: 'perpetual',
    direction: 'long',
    quantity: 1,
    notional_usd: 100,
    ...overrides,
  }
}

function makeOpenOrder(overrides: Partial<OpenOrder> = {}): OpenOrder {
  return {
    order_id: 'order-1',
    symbol: 'BTC-USDT-SWAP',
    market_type: 'perpetual',
    side: 'buy',
    order_type: 'limit',
    quantity: 1,
    status: 'open',
    ...overrides,
  }
}

describe('ExecutionWorkflow', () => {
  it('returns confirmation_required for a risk-increasing proposal in reminder mode', async () => {
    const auditRepository = new InMemoryAuditRepository()
    const workflow = new ExecutionWorkflow({
      auditRepository,
      executionAdapter: {
        async execute() {
          return { execution_id: 'exec-1' }
        },
      },
    })

    const result = await workflow.run({
      account: makeAccount({ mode: 'reminder' }),
      proposal: makeProposal(),
      open_positions: [],
      open_orders: [],
      realized_daily_loss_usd: 0,
    })

    expect(result.status).toBe('confirmation_required')
    expect(result.decision.requires_confirmation).toBe(true)
    expect(auditRepository.listByProposal(result.decision.proposal_id)).toHaveLength(1)
  })

  it('auto-executes a compliant proposal in duty trader mode', async () => {
    const auditRepository = new InMemoryAuditRepository()
    const workflow = new ExecutionWorkflow({
      auditRepository,
      executionAdapter: {
        async execute() {
          return { execution_id: 'exec-1' }
        },
      },
    })

    const result = await workflow.run({
      account: makeAccount({ mode: 'duty_trader' }),
      proposal: makeProposal(),
      open_positions: [],
      open_orders: [],
      realized_daily_loss_usd: 0,
    })

    expect(result.status).toBe('executed')
    expect(result.decision.requires_confirmation).toBe(false)
    expect(auditRepository.listByProposal(result.decision.proposal_id)).toHaveLength(1)
  })

  it('rejects close when no matching position exists', async () => {
    const workflow = new ExecutionWorkflow({
      auditRepository: new InMemoryAuditRepository(),
      executionAdapter: {
        async execute() {
          return { execution_id: 'exec-1' }
        },
      },
    })

    const result = await workflow.run({
      account: makeAccount({ mode: 'duty_trader' }),
      proposal: createProposal({
        account_id: 'alpha',
        account_name: 'Alpha OKX',
        symbol: 'BTC-USDT-SWAP',
        market_type: 'perpetual',
        intent: 'close',
        side: 'sell',
        order_type: 'market',
        size: { type: 'quantity', value: 0 },
        provenance: 'chat',
        rationale_summary: 'Close the open BTC position.',
      }),
      open_positions: [],
      open_orders: [],
      realized_daily_loss_usd: 0,
    })

    expect(result.status).toBe('rejected')
    expect(result.decision.reason_code).toBe('position_not_found')
  })

  it('normalizes close against the live position before execution', async () => {
    let executedProposalSide: string | null = null
    let executedProposalSize = 0

    const workflow = new ExecutionWorkflow({
      auditRepository: new InMemoryAuditRepository(),
      executionAdapter: {
        async execute(proposal) {
          executedProposalSide = proposal.side
          executedProposalSize = proposal.size.value
          return { execution_id: 'exec-1' }
        },
      },
    })

    const result = await workflow.run({
      account: makeAccount({ mode: 'duty_trader' }),
      proposal: createProposal({
        account_id: 'alpha',
        account_name: 'Alpha OKX',
        symbol: 'BTC-USDT-SWAP',
        market_type: 'perpetual',
        intent: 'close',
        side: 'sell',
        order_type: 'market',
        size: { type: 'quantity', value: 0 },
        provenance: 'chat',
        rationale_summary: 'Close the open BTC position.',
      }),
      open_positions: [makePosition({ direction: 'long', quantity: 2, notional_usd: 200 })],
      open_orders: [],
      realized_daily_loss_usd: 0,
    })

    expect(result.status).toBe('executed')
    expect(executedProposalSide).toBe('sell')
    expect(executedProposalSize).toBe(2)
  })

  it('binds cancel requests to the live order id when exactly one order matches', async () => {
    let executedSourceRef: string | undefined

    const workflow = new ExecutionWorkflow({
      auditRepository: new InMemoryAuditRepository(),
      executionAdapter: {
        async execute(proposal) {
          executedSourceRef = proposal.source_ref
          return { execution_id: 'exec-1' }
        },
      },
    })

    const result = await workflow.run({
      account: makeAccount({ mode: 'duty_trader' }),
      proposal: createProposal({
        account_id: 'alpha',
        account_name: 'Alpha OKX',
        symbol: 'BTC-USDT-SWAP',
        market_type: 'perpetual',
        intent: 'cancel',
        side: 'sell',
        order_type: 'limit',
        size: { type: 'quantity', value: 0 },
        provenance: 'chat',
        rationale_summary: 'Cancel the BTC order.',
      }),
      open_positions: [],
      open_orders: [makeOpenOrder({ order_id: 'order-42' })],
      realized_daily_loss_usd: 0,
    })

    expect(result.status).toBe('executed')
    expect(executedSourceRef).toBe('order-42')
  })

  it('uses side and price hints to narrow a cancel request to one order', async () => {
    let executedSourceRef: string | undefined

    const workflow = new ExecutionWorkflow({
      auditRepository: new InMemoryAuditRepository(),
      executionAdapter: {
        async execute(proposal) {
          executedSourceRef = proposal.source_ref
          return { execution_id: 'exec-1' }
        },
      },
    })

    const result = await workflow.run({
      account: makeAccount({ mode: 'duty_trader' }),
      proposal: createProposal({
        account_id: 'alpha',
        account_name: 'Alpha OKX',
        symbol: 'BTC-USDT-SWAP',
        market_type: 'perpetual',
        intent: 'cancel',
        side: 'sell',
        order_type: 'limit',
        size: { type: 'quantity', value: 0 },
        provenance: 'chat',
        rationale_summary: 'Cancel the 81200 BTC bid.',
        selection_side: 'buy',
        selection_price: 81200,
      }),
      open_positions: [],
      open_orders: [
        makeOpenOrder({ order_id: 'order-1', side: 'buy', price: 81200 }),
        makeOpenOrder({ order_id: 'order-2', side: 'sell', price: 81300 }),
      ],
      realized_daily_loss_usd: 0,
    })

    expect(result.status).toBe('executed')
    expect(executedSourceRef).toBe('order-1')
  })

  it('returns multiple_open_orders_match when cancel hints still match more than one order', async () => {
    const workflow = new ExecutionWorkflow({
      auditRepository: new InMemoryAuditRepository(),
      executionAdapter: {
        async execute() {
          return { execution_id: 'exec-1' }
        },
      },
    })

    const result = await workflow.run({
      account: makeAccount({ mode: 'duty_trader' }),
      proposal: createProposal({
        account_id: 'alpha',
        account_name: 'Alpha OKX',
        symbol: 'BTC-USDT-SWAP',
        market_type: 'perpetual',
        intent: 'cancel',
        side: 'sell',
        order_type: 'limit',
        size: { type: 'quantity', value: 0 },
        provenance: 'chat',
        rationale_summary: 'Cancel the BTC order.',
      }),
      open_positions: [],
      open_orders: [
        makeOpenOrder({ order_id: 'order-1', side: 'buy', price: 81200 }),
        makeOpenOrder({ order_id: 'order-2', side: 'buy', price: 81300 }),
      ],
      realized_daily_loss_usd: 0,
    })

    expect(result.status).toBe('rejected')
    expect(result.decision.reason_code).toBe('multiple_open_orders_match')
  })
})
