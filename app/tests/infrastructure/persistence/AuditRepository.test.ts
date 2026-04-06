import { describe, expect, it } from 'vitest'

import { createAuditEvent } from '../../../src/domain/audit/AuditEvent.js'
import { SqliteAuditRepository } from '../../../src/infrastructure/persistence/AuditRepository.js'
import { createDatabase } from '../../../src/infrastructure/persistence/Database.js'

describe('SqliteAuditRepository', () => {
  it('creates the audit_events table and stores audit records', () => {
    const database = createDatabase(':memory:')
    const repository = new SqliteAuditRepository(database)
    const event = createAuditEvent({
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
      reason_human: 'Reminder mode requires confirmation.',
      risk_snapshot_json: JSON.stringify({ proposal_notional_usd: 100 }),
      execution_snapshot_json: null,
      payload_json: JSON.stringify({ proposal_id: 'proposal-1' }),
    })

    repository.append(event)

    const rows = repository.listByProposal('proposal-1')

    expect(rows).toHaveLength(1)
    expect(rows[0]?.event_id).toBe(event.event_id)
  })
})
