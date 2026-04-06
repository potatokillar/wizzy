import type { OrderType, TradeSide } from './TradeProposal.js'
import type { MarketType } from '../risk/RiskPolicy.js'

export interface OpenOrder {
  order_id: string
  symbol: string
  market_type: MarketType
  side: TradeSide
  order_type: OrderType
  price?: number
  quantity: number
  status: 'open' | 'partially_filled'
}
