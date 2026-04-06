import { describe, expect, it } from 'vitest'

import type { Account } from '../../../src/domain/account/Account.js'
import { evaluateRisk } from '../../../src/application/risk/RiskEvaluator.js'
import { createProposal, type CreateProposalInput } from '../../../src/domain/trading/TradeProposal.js'

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
      cooldown_seconds_after_close: 300,
      max_open_positions: 3,
      require_stop_loss_for_new_positions: true,
      allow_overnight_hold: false,
      duty_trader_stop_loss_override: false,
    },
    ...overrides,
  }
}

function makeProposal(overrides: Partial<CreateProposalInput> = {}) {
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
    rationale_summary: 'Probe long after structure reclaim.',
    ...overrides,
  })
}

describe('evaluateRisk', () => {
  it('rejects risk-increasing proposal when max_order_notional_usd is exceeded', () => {
    const result = evaluateRisk({
      account: makeAccount(),
      proposal: makeProposal({ size: { type: 'notional_usd', value: 1000 } }),
      open_positions: [],
      realized_daily_loss_usd: 0,
    })

    expect(result.ok).toBe(false)
    expect(result.reason_code).toBe('max_order_notional_exceeded')
  })

  it('rejects duty-trader perpetual proposal without stop loss', () => {
    const result = evaluateRisk({
      account: makeAccount({ mode: 'duty_trader' }),
      proposal: makeProposal(),
      open_positions: [],
      realized_daily_loss_usd: 0,
    })

    expect(result.ok).toBe(false)
    expect(result.reason_code).toBe('stop_loss_required')
  })

  it('accepts a compliant proposal', () => {
    const result = evaluateRisk({
      account: makeAccount({ mode: 'duty_trader' }),
      proposal: makeProposal({
        stop_loss: {
          kind: 'stop_loss',
          trigger_price: 81000,
        },
        leverage: 2,
      }),
      open_positions: [],
      realized_daily_loss_usd: 0,
    })

    expect(result.ok).toBe(true)
    expect(result.reason_code).toBeNull()
    expect(result.derived_metrics.proposal_notional_usd).toBe(100)
  })
})
