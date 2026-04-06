import { describe, expect, it } from 'vitest'

import { ReviewService } from '../../../src/application/review/ReviewService.js'
import { createAuditEvent } from '../../../src/domain/audit/AuditEvent.js'
import { InMemoryAuditRepository } from '../../../src/infrastructure/persistence/AuditRepository.js'

describe('ReviewService', () => {
  it('builds a chronological narrative for a proposal id', async () => {
    const repository = new InMemoryAuditRepository()

    repository.append(
      createAuditEvent({
        account_id: 'alpha',
        account_name: 'Alpha OKX',
        proposal_id: 'proposal-1',
        correlation_id: 'corr-1',
        source: 'chat',
        symbol: 'BTC-USDT-SWAP',
        market_type: 'perpetual',
        intent: 'open',
        mode: 'reminder',
        decision: 'confirmation_required',
        reason_code: 'confirmation_required',
        reason_human: 'Reminder mode requires explicit confirmation.',
        risk_snapshot_json: JSON.stringify({}),
        execution_snapshot_json: null,
        payload_json: JSON.stringify({}),
      }),
    )

    repository.append(
      createAuditEvent({
        account_id: 'alpha',
        account_name: 'Alpha OKX',
        proposal_id: 'proposal-1',
        correlation_id: 'corr-1',
        source: 'chat',
        symbol: 'BTC-USDT-SWAP',
        market_type: 'perpetual',
        intent: 'open',
        mode: 'reminder',
        decision: 'executed',
        reason_code: null,
        reason_human: null,
        risk_snapshot_json: JSON.stringify({}),
        execution_snapshot_json: JSON.stringify({ execution_id: 'exec-1' }),
        payload_json: JSON.stringify({}),
      }),
    )

    const review = await new ReviewService(repository).reviewProposal('proposal-1')

    expect(review).toContain('confirmation_required')
    expect(review).toContain('executed')
  })

  it('returns a useful fallback when no audit history exists', async () => {
    const review = await new ReviewService(new InMemoryAuditRepository()).reviewProposal('missing')

    expect(review).toContain('No audit history')
  })
})
