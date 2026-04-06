import type { Account } from '../../domain/account/Account.js'
import type { MarketType, RiskPolicy } from '../../domain/risk/RiskPolicy.js'
import type { ProposalIntent, TradeProposal } from '../../domain/trading/TradeProposal.js'

export interface PositionSnapshot {
  symbol: string
  market_type: MarketType
  notional_usd: number
}

export interface RecentCloseSnapshot {
  symbol: string
  closed_at: string
}

export interface EvaluateRiskInput {
  account: Account
  proposal: TradeProposal
  open_positions: PositionSnapshot[]
  realized_daily_loss_usd: number
  recent_closes?: RecentCloseSnapshot[]
  now?: Date
}

export interface RiskEvaluationResult {
  ok: boolean
  reason_code: string | null
  reason_human: string | null
  derived_metrics: {
    proposal_notional_usd: number
    gross_exposure_after_fill_usd: number
    position_notional_after_fill_usd: number
    cooldown_remaining_seconds: number
  }
}

function isRiskIncreasing(intent: ProposalIntent): boolean {
  return intent === 'open' || intent === 'increase'
}

function getProposalNotionalUsd(proposal: TradeProposal): number {
  // The MVP needs one comparable notional figure for limit checks, even before exchange-specific sizing logic exists.
  switch (proposal.size.type) {
    case 'notional_usd':
      return proposal.size.value
    case 'quote_notional':
      return proposal.size.value
    case 'quantity':
    case 'base_units':
      return proposal.size.value
  }
}

function getCurrentSymbolExposureUsd(openPositions: PositionSnapshot[], symbol: string): number {
  return openPositions
    .filter((position) => position.symbol === symbol)
    .reduce((sum, position) => sum + Math.abs(position.notional_usd), 0)
}

function getGrossExposureUsd(openPositions: PositionSnapshot[]): number {
  return openPositions.reduce((sum, position) => sum + Math.abs(position.notional_usd), 0)
}

function getCooldownRemainingSeconds(
  policy: RiskPolicy,
  recentCloses: RecentCloseSnapshot[],
  symbol: string,
  now: Date,
): number {
  const latestClose = recentCloses
    .filter((close) => close.symbol === symbol)
    .sort((left, right) => right.closed_at.localeCompare(left.closed_at))[0]

  if (!latestClose) {
    return 0
  }

  const elapsedSeconds = Math.floor((now.getTime() - new Date(latestClose.closed_at).getTime()) / 1000)
  return Math.max(0, policy.cooldown_seconds_after_close - elapsedSeconds)
}

function reject(
  reasonCode: string,
  reasonHuman: string,
  proposalNotionalUsd: number,
  grossExposureAfterFillUsd: number,
  positionNotionalAfterFillUsd: number,
  cooldownRemainingSeconds: number,
): RiskEvaluationResult {
  return {
    ok: false,
    reason_code: reasonCode,
    reason_human: reasonHuman,
    derived_metrics: {
      proposal_notional_usd: proposalNotionalUsd,
      gross_exposure_after_fill_usd: grossExposureAfterFillUsd,
      position_notional_after_fill_usd: positionNotionalAfterFillUsd,
      cooldown_remaining_seconds: cooldownRemainingSeconds,
    },
  }
}

export function evaluateRisk(input: EvaluateRiskInput): RiskEvaluationResult {
  const { account, proposal } = input
  const recentCloses = input.recent_closes ?? []
  const now = input.now ?? new Date()
  const policy = account.risk_policy

  const proposalNotionalUsd = getProposalNotionalUsd(proposal)
  const currentSymbolExposureUsd = getCurrentSymbolExposureUsd(input.open_positions, proposal.symbol)
  const grossExposureUsd = getGrossExposureUsd(input.open_positions)
  const riskIncreasing = isRiskIncreasing(proposal.intent)
  const nextSymbolExposureUsd = riskIncreasing
    ? currentSymbolExposureUsd + proposalNotionalUsd
    : Math.max(0, currentSymbolExposureUsd - proposalNotionalUsd)
  const nextGrossExposureUsd = riskIncreasing
    ? grossExposureUsd + proposalNotionalUsd
    : Math.max(0, grossExposureUsd - proposalNotionalUsd)
  const cooldownRemainingSeconds = getCooldownRemainingSeconds(policy, recentCloses, proposal.symbol, now)

  // Invalid account configuration must block execution deterministically before any market-facing step.
  if (account.mode === 'duty_trader' && policy.allowed_symbols.length === 0) {
    return reject(
      'risk_configuration_invalid',
      'Duty trader accounts must declare at least one allowed symbol.',
      proposalNotionalUsd,
      nextGrossExposureUsd,
      nextSymbolExposureUsd,
      cooldownRemainingSeconds,
    )
  }

  if (
    account.mode === 'duty_trader' &&
    !policy.require_stop_loss_for_new_positions &&
    !policy.duty_trader_stop_loss_override
  ) {
    return reject(
      'risk_configuration_invalid',
      'Duty trader accounts must require stop loss or explicitly opt into the override.',
      proposalNotionalUsd,
      nextGrossExposureUsd,
      nextSymbolExposureUsd,
      cooldownRemainingSeconds,
    )
  }

  if (!policy.allowed_symbols.includes(proposal.symbol)) {
    return reject(
      'allowed_symbol_violation',
      `Symbol ${proposal.symbol} is not allowed for this account.`,
      proposalNotionalUsd,
      nextGrossExposureUsd,
      nextSymbolExposureUsd,
      cooldownRemainingSeconds,
    )
  }

  if (!policy.allowed_market_types.includes(proposal.market_type)) {
    return reject(
      'allowed_market_type_violation',
      `Market type ${proposal.market_type} is not allowed for this account.`,
      proposalNotionalUsd,
      nextGrossExposureUsd,
      nextSymbolExposureUsd,
      cooldownRemainingSeconds,
    )
  }

  if (input.realized_daily_loss_usd >= policy.daily_realized_loss_limit_usd && riskIncreasing) {
    return reject(
      'daily_loss_limit_reached',
      'Daily realized loss limit reached for this account.',
      proposalNotionalUsd,
      nextGrossExposureUsd,
      nextSymbolExposureUsd,
      cooldownRemainingSeconds,
    )
  }

  if (proposalNotionalUsd > policy.max_order_notional_usd && riskIncreasing) {
    return reject(
      'max_order_notional_exceeded',
      'Proposal exceeds the maximum order notional.',
      proposalNotionalUsd,
      nextGrossExposureUsd,
      nextSymbolExposureUsd,
      cooldownRemainingSeconds,
    )
  }

  if (nextSymbolExposureUsd > policy.max_position_notional_usd && riskIncreasing) {
    return reject(
      'max_position_notional_exceeded',
      'Proposal would exceed the maximum position notional.',
      proposalNotionalUsd,
      nextGrossExposureUsd,
      nextSymbolExposureUsd,
      cooldownRemainingSeconds,
    )
  }

  if (nextGrossExposureUsd > policy.max_account_gross_exposure_usd && riskIncreasing) {
    return reject(
      'max_account_gross_exposure_exceeded',
      'Proposal would exceed the account gross exposure limit.',
      proposalNotionalUsd,
      nextGrossExposureUsd,
      nextSymbolExposureUsd,
      cooldownRemainingSeconds,
    )
  }

  if (
    riskIncreasing &&
    proposal.intent === 'open' &&
    input.open_positions.length >= policy.max_open_positions
  ) {
    return reject(
      'max_open_positions_exceeded',
      'Proposal would exceed the maximum number of open positions.',
      proposalNotionalUsd,
      nextGrossExposureUsd,
      nextSymbolExposureUsd,
      cooldownRemainingSeconds,
    )
  }

  if (cooldownRemainingSeconds > 0 && riskIncreasing) {
    return reject(
      'cooldown_active',
      'Cooldown after the latest close is still active for this symbol.',
      proposalNotionalUsd,
      nextGrossExposureUsd,
      nextSymbolExposureUsd,
      cooldownRemainingSeconds,
    )
  }

  if (
    account.mode === 'duty_trader' &&
    riskIncreasing &&
    proposal.market_type === 'perpetual' &&
    policy.require_stop_loss_for_new_positions &&
    !proposal.stop_loss
  ) {
    // Duty-trader accounts must make the stop-loss requirement explicit in proposal data, not as an implied habit.
    return reject(
      'stop_loss_required',
      'A stop loss is required for new or larger perpetual positions in duty trader mode.',
      proposalNotionalUsd,
      nextGrossExposureUsd,
      nextSymbolExposureUsd,
      cooldownRemainingSeconds,
    )
  }

  if (
    proposal.market_type === 'perpetual' &&
    proposal.leverage !== undefined &&
    proposal.leverage > policy.max_leverage &&
    riskIncreasing
  ) {
    return reject(
      'max_leverage_exceeded',
      'Proposal leverage exceeds the account maximum leverage.',
      proposalNotionalUsd,
      nextGrossExposureUsd,
      nextSymbolExposureUsd,
      cooldownRemainingSeconds,
    )
  }

  return {
    ok: true,
    reason_code: null,
    reason_human: null,
    derived_metrics: {
      proposal_notional_usd: proposalNotionalUsd,
      gross_exposure_after_fill_usd: nextGrossExposureUsd,
      position_notional_after_fill_usd: nextSymbolExposureUsd,
      cooldown_remaining_seconds: cooldownRemainingSeconds,
    },
  }
}
