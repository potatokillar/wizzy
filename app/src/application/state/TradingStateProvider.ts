import type { OpenOrder } from '../../domain/trading/OpenOrder.js'
import type { Position } from '../../domain/trading/Position.js'

export interface TradingStateSnapshot {
  open_positions: Position[]
  open_orders: OpenOrder[]
  realized_daily_loss_usd: number
}

export interface TradingStateProvider {
  getAccountState(accountId: string): Promise<TradingStateSnapshot>
}
