import crypto from 'node:crypto'

import type { MarketType } from '../risk/RiskPolicy.js'

export type ProposalIntent =
  | 'open'
  | 'increase'
  | 'reduce'
  | 'close'
  | 'cancel'
  | 'modify_protection'

export type ProposalSource = 'chat' | 'strategy' | 'task' | 'protective_automation'
export type OrderType = 'market' | 'limit'
export type TradeSide = 'buy' | 'sell'
export type OrderSelectionScope = 'single_best_match' | 'all_for_symbol' | 'all_for_account'

export type ProposalSize =
  | { type: 'quantity'; value: number }
  | { type: 'base_units'; value: number }
  | { type: 'quote_notional'; value: number }
  | { type: 'notional_usd'; value: number }

export interface ProtectiveInstruction {
  kind: 'stop_loss' | 'take_profit'
  trigger_price: number
  order_price?: number
  reduce_only?: boolean
  size_fraction?: number
}

export interface CreateProposalInput {
  account_id: string
  account_name: string
  symbol: string
  market_type: MarketType
  intent: ProposalIntent
  side: TradeSide
  order_type: OrderType
  size: ProposalSize
  provenance: ProposalSource
  rationale_summary: string
  limit_price?: number
  leverage?: number
  reduce_only?: boolean
  stop_loss?: ProtectiveInstruction
  take_profit?: ProtectiveInstruction
  correlation_id?: string
  source_ref?: string
  selection_scope?: OrderSelectionScope
  selection_side?: TradeSide
  selection_price?: number
}

export interface TradeProposal extends CreateProposalInput {
  proposal_id: string
  created_at: string
}

export function createProposal(input: CreateProposalInput): TradeProposal {
  return {
    proposal_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    // The proposal stays exchange-agnostic so every execution path can share one workflow.
    ...input,
  }
}
