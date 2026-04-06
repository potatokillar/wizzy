import { describe, expect, it } from 'vitest'

import { createProposal } from '../../../src/domain/trading/TradeProposal.js'

describe('createProposal', () => {
  it('creates a proposal with proposal_id and provenance', () => {
    const proposal = createProposal({
      account_id: 'alpha',
      account_name: 'Alpha OKX',
      symbol: 'BTC-USDT-SWAP',
      market_type: 'perpetual',
      intent: 'open',
      side: 'buy',
      order_type: 'market',
      size: { type: 'notional_usd', value: 100 },
      provenance: 'chat',
      rationale_summary: 'Probe long on regained intraday momentum.',
    })

    expect(proposal.proposal_id).toBeTruthy()
    expect(proposal.provenance).toBe('chat')
    expect(proposal.created_at).toBeTruthy()
  })
})
