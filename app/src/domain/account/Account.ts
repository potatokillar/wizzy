import type { RiskPolicy } from '../risk/RiskPolicy.js'

export type AccountMode = 'reminder' | 'duty_trader'
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
export type MarginMode = 'cross' | 'isolated'
export type PositionMode = 'one_way'

export interface ExecutionPermissions {
  can_open_position: boolean
  can_increase_position: boolean
  can_reduce_position: boolean
  can_close_position: boolean
  can_cancel_order: boolean
  can_modify_protection_orders: boolean
}

export interface PerpetualSettings {
  margin_mode: MarginMode
  position_mode: PositionMode
}

export interface Account {
  id: string
  name: string
  exchange: 'okx'
  enabled: boolean
  secret_ref: string
  connection_status: ConnectionStatus
  mode: AccountMode
  execution_permissions: ExecutionPermissions
  risk_policy: RiskPolicy
  perpetual_settings?: PerpetualSettings
  session_boundary_utc?: string
}
