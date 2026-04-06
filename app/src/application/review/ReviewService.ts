import type { AuditRepository } from '../../infrastructure/persistence/AuditRepository.js'

export class ReviewService {
  readonly #auditRepository: AuditRepository

  constructor(auditRepository: AuditRepository) {
    this.#auditRepository = auditRepository
  }

  async reviewProposal(proposalId: string): Promise<string> {
    const events = this.#auditRepository.listByProposal(proposalId)

    if (events.length === 0) {
      return `No audit history found for proposal ${proposalId}.`
    }

    return events
      .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
      .map((event) => {
        // Keep the narrative terse so it works both in chat replies and future TUI audit panels.
        const reason = event.reason_human ? ` ${event.reason_human}` : ''
        return `${event.timestamp} ${event.decision}${reason}`.trim()
      })
      .join('\n')
  }
}
