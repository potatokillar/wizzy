export type ExecutionStatus =
  | 'proposal_created'
  | 'rejected'
  | 'confirmation_required'
  | 'confirmed'
  | 'submitted'
  | 'executed'
  | 'failed'
  | 'canceled'

export interface ExecutionDecision {
  decision_id: string
  proposal_id: string
  timestamp: string
  account_id: string
  mode: 'reminder' | 'duty_trader'
  status: ExecutionStatus
  reason_code: string | null
  reason_human: string | null
  requires_confirmation: boolean
  audit_event_ids: string[]
}
