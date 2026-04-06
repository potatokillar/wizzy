export type MarketType = 'spot' | 'perpetual'

export interface RiskPolicy {
  max_position_notional_usd: number
  max_order_notional_usd: number
  max_account_gross_exposure_usd: number
  max_per_trade_loss_usd: number
  max_leverage: number
  daily_realized_loss_limit_usd: number
  allowed_symbols: string[]
  allowed_market_types: MarketType[]
  cooldown_seconds_after_close: number
  max_open_positions: number
  require_stop_loss_for_new_positions: boolean
  allow_overnight_hold: boolean
  duty_trader_stop_loss_override: boolean
}
