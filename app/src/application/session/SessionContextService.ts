export interface SessionContextInput {
  defaultAccount: string | null
}

export class SessionContextService {
  #activeAccountId: string | null

  constructor(input: SessionContextInput) {
    this.#activeAccountId = input.defaultAccount
  }

  getActiveAccount(): string | null {
    return this.#activeAccountId
  }

  switchAccount(accountId: string): void {
    this.#activeAccountId = accountId
  }

  clearActiveAccount(): void {
    this.#activeAccountId = null
  }

  canRunExecutionFlow(): boolean {
    return this.#activeAccountId !== null
  }
}
