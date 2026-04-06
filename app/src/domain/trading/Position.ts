import type { MarketType } from '../risk/RiskPolicy.js'

export type PositionDirection = 'long' | 'short'

export interface Position {
  symbol: string
  market_type: MarketType
  direction: PositionDirection
  quantity: number
  notional_usd: number
}
