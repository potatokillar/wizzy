import crypto from 'node:crypto'

export interface AuditEventInput {
  account_id: string
  account_name: string
  proposal_id: string
  correlation_id: string
  source: string
  symbol: string
  market_type: string
  intent: string
  mode: string
  decision: string
  reason_code?: string | null
  reason_human?: string | null
  risk_snapshot_json: string
  execution_snapshot_json?: string | null
  payload_json: string
}

export interface AuditEvent extends AuditEventInput {
  event_id: string
  timestamp: string
}

export function createAuditEvent(input: AuditEventInput): AuditEvent {
  return {
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...input,
  }
}
