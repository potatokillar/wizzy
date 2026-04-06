import type { TradingStateProvider, TradingStateSnapshot } from '../../application/state/TradingStateProvider.js'

export class InMemoryTradingStateProvider implements TradingStateProvider {
  readonly #states: Map<string, TradingStateSnapshot>

  constructor(initialState: Record<string, TradingStateSnapshot> = {}) {
    this.#states = new Map(Object.entries(initialState))
  }

  async getAccountState(accountId: string): Promise<TradingStateSnapshot> {
    // The provider returns empty state by default so chat and execution wiring can be exercised before exchange sync exists.
    return (
      this.#states.get(accountId) ?? {
        open_positions: [],
        open_orders: [],
        realized_daily_loss_usd: 0,
      }
    )
  }
}
