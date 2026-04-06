import { z } from 'zod'

export const AppConfigSchema = z.object({
  schema_version: z.literal(1),
  market_freshness_ms: z.number().positive(),
  default_account: z.string().nullable(),
  session_boundary_utc: z.string(),
})

export const ExecutionPermissionsSchema = z.object({
  can_open_position: z.boolean(),
  can_increase_position: z.boolean(),
  can_reduce_position: z.boolean(),
  can_close_position: z.boolean(),
  can_cancel_order: z.boolean(),
  can_modify_protection_orders: z.boolean(),
})

export const RiskPolicySchema = z.object({
  max_position_notional_usd: z.number().positive(),
  max_order_notional_usd: z.number().positive(),
  max_account_gross_exposure_usd: z.number().positive(),
  max_per_trade_loss_usd: z.number().positive(),
  max_leverage: z.number().positive(),
  daily_realized_loss_limit_usd: z.number().positive(),
  allowed_symbols: z.array(z.string()).min(1),
  allowed_market_types: z.array(z.enum(['spot', 'perpetual'])).min(1),
  cooldown_seconds_after_close: z.number().min(0),
  max_open_positions: z.number().positive(),
  require_stop_loss_for_new_positions: z.boolean(),
  allow_overnight_hold: z.boolean(),
  duty_trader_stop_loss_override: z.boolean(),
})

export const AccountSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    exchange: z.literal('okx'),
    enabled: z.boolean(),
    secret_ref: z.string().min(1),
    connection_status: z.enum(['disconnected', 'connecting', 'connected', 'error']),
    mode: z.enum(['reminder', 'duty_trader']),
    perpetual_settings: z
      .object({
        margin_mode: z.enum(['cross', 'isolated']),
        position_mode: z.literal('one_way'),
      })
      .optional(),
    execution_permissions: ExecutionPermissionsSchema,
    risk_policy: RiskPolicySchema,
    session_boundary_utc: z.string().optional(),
  })
  .superRefine((account, ctx) => {
    const supportsPerpetual = account.risk_policy.allowed_market_types.includes('perpetual')

    // Perpetual-capable accounts must declare exchange-specific perpetual settings explicitly.
    if (supportsPerpetual && !account.perpetual_settings) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'perpetual_settings are required when perpetual market type is enabled',
        path: ['perpetual_settings'],
      })
    }
  })

export const AccountsSchema = z.array(AccountSchema)
export const StrategiesSchema = z.array(z.unknown())
export const UiSchema = z.object({
  schema_version: z.literal(1),
  confirm_before_exit: z.boolean(),
})

export type AppConfig = z.infer<typeof AppConfigSchema>
export type AccountConfig = z.infer<typeof AccountSchema>
export type LoadedConfig = {
  app: AppConfig
  accounts: z.infer<typeof AccountsSchema>
  strategies: z.infer<typeof StrategiesSchema>
  ui: z.infer<typeof UiSchema>
}
