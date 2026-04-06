import { describe, expect, it } from 'vitest'

import type { Account } from '../../../src/domain/account/Account.js'
import { parseTradeRequest } from '../../../src/application/chat/TradeRequestParser.js'

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

describe('parseTradeRequest', () => {
  it('returns proposal_ready for an explicit notional trade request', () => {
    const result = parseTradeRequest('open btc perp long $100', makeAccount())

    expect(result.type).toBe('proposal_ready')
    if (result.type === 'proposal_ready') {
      expect(result.parsed.symbol_hint).toBe('BTC-USDT-SWAP')
      expect(result.parsed.size_hint).toEqual({ type: 'notional_usd', value: 100 })
    }
  })

  it('requires clarification for subjective sizing words', () => {
    const result = parseTradeRequest('open a small btc long', makeAccount())

    expect(result.type).toBe('clarification_required')
    if (result.type === 'clarification_required') {
      expect(result.missing_fields).toContain('size')
    }
  })

  it('requires clarification when symbol is ambiguous', () => {
    const result = parseTradeRequest('open btc and eth long $100', makeAccount())

    expect(result.type).toBe('clarification_required')
    if (result.type === 'clarification_required') {
      expect(result.missing_fields).toContain('symbol')
    }
  })

  it('parses explicit limit price and protection fields', () => {
    const result = parseTradeRequest('open btc perp long $100 limit at 81200 sl 80500 tp 83000', makeAccount())

    expect(result.type).toBe('proposal_ready')
    if (result.type === 'proposal_ready') {
      expect(result.parsed.order_type).toBe('limit')
      expect(result.parsed.limit_price_hint).toBe(81200)
      expect(result.parsed.stop_loss_hint?.trigger_price).toBe(80500)
      expect(result.parsed.take_profit_hint?.trigger_price).toBe(83000)
    }
  })

  it('allows cancel without direction or size', () => {
    const result = parseTradeRequest('cancel btc perp order', makeAccount())

    expect(result.type).toBe('proposal_ready')
    if (result.type === 'proposal_ready') {
      expect(result.parsed.intent).toBe('cancel')
      expect(result.parsed.direction).toBeNull()
      expect(result.parsed.size_hint).toBeNull()
    }
  })

  it('extracts cancel selection hints from price and side wording', () => {
    const result = parseTradeRequest('cancel btc perp 81200 bid limit', makeAccount())

    expect(result.type).toBe('proposal_ready')
    if (result.type === 'proposal_ready') {
      expect(result.parsed.selection_scope).toBe('single_best_match')
      expect(result.parsed.side_hint).toBe('buy')
      expect(result.parsed.price_hint).toBe(81200)
      expect(result.parsed.order_type).toBe('limit')
    }
  })

  it('rejects bulk cancel requests for now', () => {
    const result = parseTradeRequest('cancel all btc orders', makeAccount())

    expect(result.type).toBe('unsupported_request')
  })
})
