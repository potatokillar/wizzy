import type { AuditEvent } from '../../domain/audit/AuditEvent.js'
import type { DatabaseSync } from 'node:sqlite'

export interface AuditRepository {
  append(event: AuditEvent): void
  listByProposal(proposalId: string): AuditEvent[]
}

export class InMemoryAuditRepository implements AuditRepository {
  readonly #events: AuditEvent[] = []

  append(event: AuditEvent): void {
    this.#events.push(event)
  }

  listByProposal(proposalId: string): AuditEvent[] {
    return this.#events.filter((event) => event.proposal_id === proposalId)
  }
}

export class SqliteAuditRepository implements AuditRepository {
  readonly #database: DatabaseSync

  constructor(database: DatabaseSync) {
    this.#database = database
  }

  append(event: AuditEvent): void {
    this.#database
      .prepare(
        `
          insert into audit_events (
            event_id,
            timestamp,
            account_id,
            account_name,
            proposal_id,
            correlation_id,
            source,
            symbol,
            market_type,
            intent,
            mode,
            decision,
            reason_code,
            reason_human,
            risk_snapshot_json,
            execution_snapshot_json,
            payload_json
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        event.event_id,
        event.timestamp,
        event.account_id,
        event.account_name,
        event.proposal_id,
        event.correlation_id,
        event.source,
        event.symbol,
        event.market_type,
        event.intent,
        event.mode,
        event.decision,
        event.reason_code ?? null,
        event.reason_human ?? null,
        event.risk_snapshot_json,
        event.execution_snapshot_json ?? null,
        event.payload_json,
      )
  }

  listByProposal(proposalId: string): AuditEvent[] {
    const rows = this.#database
      .prepare(
        `
          select
            event_id,
            timestamp,
            account_id,
            account_name,
            proposal_id,
            correlation_id,
            source,
            symbol,
            market_type,
            intent,
            mode,
            decision,
            reason_code,
            reason_human,
            risk_snapshot_json,
            execution_snapshot_json,
            payload_json
          from audit_events
          where proposal_id = ?
          order by timestamp asc
        `,
      )
      .all(proposalId) as Array<Record<string, unknown>>

    // Normalize the driver row shape explicitly so the repository remains the only SQLite-aware boundary.
    return rows.map((row) => ({
      event_id: String(row.event_id),
      timestamp: String(row.timestamp),
      account_id: String(row.account_id),
      account_name: String(row.account_name),
      proposal_id: String(row.proposal_id),
      correlation_id: String(row.correlation_id),
      source: String(row.source),
      symbol: String(row.symbol),
      market_type: String(row.market_type),
      intent: String(row.intent),
      mode: String(row.mode),
      decision: String(row.decision),
      reason_code: row.reason_code === null ? null : String(row.reason_code),
      reason_human: row.reason_human === null ? null : String(row.reason_human),
      risk_snapshot_json: String(row.risk_snapshot_json),
      execution_snapshot_json:
        row.execution_snapshot_json === null ? null : String(row.execution_snapshot_json),
      payload_json: String(row.payload_json),
    }))
  }
}
