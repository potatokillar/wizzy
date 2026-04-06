import crypto from 'node:crypto'

import { createAuditEvent } from '../../domain/audit/AuditEvent.js'
import type { Account } from '../../domain/account/Account.js'
import type { AuditRepository } from '../../infrastructure/persistence/AuditRepository.js'
import {
  evaluateRisk,
  type EvaluateRiskInput,
  type PositionSnapshot,
} from '../risk/RiskEvaluator.js'
import type { ExecutionDecision } from '../../domain/trading/ExecutionDecision.js'
import type { TradeProposal } from '../../domain/trading/TradeProposal.js'
import type { OpenOrder } from '../../domain/trading/OpenOrder.js'
import type { Position } from '../../domain/trading/Position.js'

export interface ExecutionResult {
  status: ExecutionDecision['status']
  decision: ExecutionDecision
}

export interface ExecutionAdapter {
  execute(proposal: TradeProposal): Promise<{ execution_id: string }>
}

export interface ExecutionWorkflowInput {
  auditRepository: AuditRepository
  executionAdapter: ExecutionAdapter
}

export interface RunExecutionInput {
  account: Account
  proposal: TradeProposal
  open_positions: Position[]
  open_orders: OpenOrder[]
  realized_daily_loss_usd: number
}

function isRiskIncreasing(intent: TradeProposal['intent']): boolean {
  return intent === 'open' || intent === 'increase'
}

function toRiskSnapshots(positions: Position[]): PositionSnapshot[] {
  return positions.map((position) => ({
    symbol: position.symbol,
    market_type: position.market_type,
    notional_usd: position.notional_usd,
  }))
}

function resolveCloseOrReduceSide(position: Position): 'buy' | 'sell' {
  return position.direction === 'long' ? 'sell' : 'buy'
}

function createRejectedResult(
  auditRepository: AuditRepository,
  input: RunExecutionInput,
  reasonCode: string,
  reasonHuman: string,
  riskSnapshot: unknown,
): ExecutionResult {
  const auditEvent = createAuditEvent({
    account_id: input.account.id,
    account_name: input.account.name,
    proposal_id: input.proposal.proposal_id,
    correlation_id: input.proposal.correlation_id ?? input.proposal.proposal_id,
    source: input.proposal.provenance,
    symbol: input.proposal.symbol,
    market_type: input.proposal.market_type,
    intent: input.proposal.intent,
    mode: input.account.mode,
    decision: 'rejected',
    reason_code: reasonCode,
    reason_human: reasonHuman,
    risk_snapshot_json: JSON.stringify(riskSnapshot),
    execution_snapshot_json: null,
    payload_json: JSON.stringify(input.proposal),
  })

  auditRepository.append(auditEvent)

  return {
    status: 'rejected',
    decision: makeDecision({
      proposal: input.proposal,
      account: input.account,
      status: 'rejected',
      reason_code: reasonCode,
      reason_human: reasonHuman,
      audit_event_ids: [auditEvent.event_id],
      requires_confirmation: false,
    }),
  }
}

function resolveProposalAgainstState(
  proposal: TradeProposal,
  positions: Position[],
  openOrders: OpenOrder[],
):
  | { ok: true; proposal: TradeProposal }
  | { ok: false; reason_code: string; reason_human: string } {
  if (proposal.intent === 'close') {
    const position = positions.find(
      (item) => item.symbol === proposal.symbol && item.market_type === proposal.market_type,
    )

    if (!position) {
      return {
        ok: false,
        reason_code: 'position_not_found',
        reason_human: 'No open position matches this close request.',
      }
    }

    return {
      ok: true,
      proposal: {
        ...proposal,
        side: resolveCloseOrReduceSide(position),
        // Close should target the full open position rather than rely on a placeholder size.
        size: { type: 'quantity', value: position.quantity },
        reduce_only: true,
      },
    }
  }

  if (proposal.intent === 'reduce') {
    const position = positions.find(
      (item) => item.symbol === proposal.symbol && item.market_type === proposal.market_type,
    )

    if (!position) {
      return {
        ok: false,
        reason_code: 'position_not_found',
        reason_human: 'No open position matches this reduce request.',
      }
    }

    if (proposal.size.type === 'quantity' && proposal.size.value <= 0) {
      return {
        ok: false,
        reason_code: 'size_required_for_reduce',
        reason_human: 'Reduce requests need an explicit size in the current MVP.',
      }
    }

    return {
      ok: true,
      proposal: {
        ...proposal,
        side: resolveCloseOrReduceSide(position),
        reduce_only: true,
      },
    }
  }

  if (proposal.intent === 'cancel') {
    let matchingOrders = openOrders.filter(
      (item) => item.symbol === proposal.symbol && item.market_type === proposal.market_type,
    )

    if (proposal.selection_side) {
      matchingOrders = matchingOrders.filter((item) => item.side === proposal.selection_side)
    }

    if (proposal.order_type === 'limit') {
      matchingOrders = matchingOrders.filter((item) => item.order_type === 'limit')
    }

    if (proposal.selection_price !== undefined) {
      // Price is only meaningful for priced orders, so it should narrow the candidate set after symbol and side.
      matchingOrders = matchingOrders.filter(
        (item) => item.order_type === 'limit' && item.price === proposal.selection_price,
      )
    }

    if (matchingOrders.length === 0) {
      return {
        ok: false,
        reason_code: 'open_order_not_found',
        reason_human: 'No open order matches this cancel request.',
      }
    }

    if (matchingOrders.length > 1) {
      return {
        ok: false,
        reason_code: 'multiple_open_orders_match',
        reason_human: 'More than one open order matches this cancel request.',
      }
    }

    return {
        ok: true,
        proposal: {
          ...proposal,
          source_ref: matchingOrders[0].order_id,
        },
    }
  }

  return { ok: true, proposal }
}

function checkPermission(account: Account, proposal: TradeProposal): { ok: boolean; reason_code?: string; reason_human?: string } {
  const permissions = account.execution_permissions

  switch (proposal.intent) {
    case 'open':
      return permissions.can_open_position
        ? { ok: true }
        : {
            ok: false,
            reason_code: 'permission_denied_open_position',
            reason_human: 'This account cannot open new positions.',
          }
    case 'increase':
      return permissions.can_increase_position
        ? { ok: true }
        : {
            ok: false,
            reason_code: 'permission_denied_increase_position',
            reason_human: 'This account cannot increase positions.',
          }
    case 'reduce':
      return permissions.can_reduce_position
        ? { ok: true }
        : {
            ok: false,
            reason_code: 'permission_denied_reduce_position',
            reason_human: 'This account cannot reduce positions.',
          }
    case 'close':
      return permissions.can_close_position
        ? { ok: true }
        : {
            ok: false,
            reason_code: 'permission_denied_close_position',
            reason_human: 'This account cannot close positions.',
          }
    case 'cancel':
      return permissions.can_cancel_order
        ? { ok: true }
        : {
            ok: false,
            reason_code: 'permission_denied_cancel_order',
            reason_human: 'This account cannot cancel orders.',
          }
    case 'modify_protection':
      return permissions.can_modify_protection_orders
        ? { ok: true }
        : {
            ok: false,
            reason_code: 'permission_denied_modify_protection',
            reason_human: 'This account cannot modify protection orders.',
          }
  }
}

function makeDecision(input: {
  proposal: TradeProposal
  account: Account
  status: ExecutionDecision['status']
  reason_code?: string | null
  reason_human?: string | null
  audit_event_ids: string[]
  requires_confirmation: boolean
}): ExecutionDecision {
  return {
    decision_id: crypto.randomUUID(),
    proposal_id: input.proposal.proposal_id,
    timestamp: new Date().toISOString(),
    account_id: input.account.id,
    mode: input.account.mode,
    status: input.status,
    reason_code: input.reason_code ?? null,
    reason_human: input.reason_human ?? null,
    requires_confirmation: input.requires_confirmation,
    audit_event_ids: input.audit_event_ids,
  }
}

export class ExecutionWorkflow {
  readonly #auditRepository: AuditRepository
  readonly #executionAdapter: ExecutionAdapter

  constructor(input: ExecutionWorkflowInput) {
    this.#auditRepository = input.auditRepository
    this.#executionAdapter = input.executionAdapter
  }

  async run(input: RunExecutionInput): Promise<ExecutionResult> {
    const stateResolution = resolveProposalAgainstState(
      input.proposal,
      input.open_positions,
      input.open_orders,
    )

    if (!stateResolution.ok) {
      return createRejectedResult(
        this.#auditRepository,
        input,
        stateResolution.reason_code,
        stateResolution.reason_human,
        {},
      )
    }

    const resolvedInput: RunExecutionInput = {
      ...input,
      proposal: stateResolution.proposal,
    }

    const permissionResult = checkPermission(resolvedInput.account, resolvedInput.proposal)

    if (!permissionResult.ok) {
      return createRejectedResult(
        this.#auditRepository,
        resolvedInput,
        permissionResult.reason_code ?? 'permission_denied',
        permissionResult.reason_human ?? 'Permission denied.',
        {},
      )
    }

    const riskResult = evaluateRisk({
      account: resolvedInput.account,
      proposal: resolvedInput.proposal,
      open_positions: toRiskSnapshots(resolvedInput.open_positions),
      realized_daily_loss_usd: resolvedInput.realized_daily_loss_usd,
    } satisfies EvaluateRiskInput)

    if (!riskResult.ok) {
      return createRejectedResult(
        this.#auditRepository,
        resolvedInput,
        riskResult.reason_code ?? 'risk_rejected',
        riskResult.reason_human ?? 'Risk evaluation rejected the proposal.',
        riskResult.derived_metrics,
      )
    }

    const riskIncreasing = isRiskIncreasing(resolvedInput.proposal.intent)

    if (resolvedInput.account.mode === 'reminder' && riskIncreasing) {
      // Reminder mode must stop at the confirmation boundary for new or larger risk.
      const auditEvent = createAuditEvent({
        account_id: resolvedInput.account.id,
        account_name: resolvedInput.account.name,
        proposal_id: resolvedInput.proposal.proposal_id,
        correlation_id: resolvedInput.proposal.correlation_id ?? resolvedInput.proposal.proposal_id,
        source: resolvedInput.proposal.provenance,
        symbol: resolvedInput.proposal.symbol,
        market_type: resolvedInput.proposal.market_type,
        intent: resolvedInput.proposal.intent,
        mode: resolvedInput.account.mode,
        decision: 'confirmation_required',
        reason_code: 'confirmation_required',
        reason_human: 'Reminder mode requires explicit confirmation for risk-increasing actions.',
        risk_snapshot_json: JSON.stringify(riskResult.derived_metrics),
        execution_snapshot_json: null,
        payload_json: JSON.stringify(resolvedInput.proposal),
      })

      this.#auditRepository.append(auditEvent)

      return {
        status: 'confirmation_required',
        decision: makeDecision({
          proposal: resolvedInput.proposal,
          account: resolvedInput.account,
          status: 'confirmation_required',
          reason_code: 'confirmation_required',
          reason_human: 'Reminder mode requires explicit confirmation for risk-increasing actions.',
          audit_event_ids: [auditEvent.event_id],
          requires_confirmation: true,
        }),
      }
    }

    const executionResult = await this.#executionAdapter.execute(resolvedInput.proposal)
    const auditEvent = createAuditEvent({
      account_id: resolvedInput.account.id,
      account_name: resolvedInput.account.name,
      proposal_id: resolvedInput.proposal.proposal_id,
      correlation_id: resolvedInput.proposal.correlation_id ?? resolvedInput.proposal.proposal_id,
      source: resolvedInput.proposal.provenance,
      symbol: resolvedInput.proposal.symbol,
      market_type: resolvedInput.proposal.market_type,
      intent: resolvedInput.proposal.intent,
      mode: resolvedInput.account.mode,
      decision: 'executed',
      reason_code: null,
      reason_human: null,
      risk_snapshot_json: JSON.stringify(riskResult.derived_metrics),
      execution_snapshot_json: JSON.stringify(executionResult),
      payload_json: JSON.stringify(resolvedInput.proposal),
    })

    this.#auditRepository.append(auditEvent)

    return {
      status: 'executed',
      decision: makeDecision({
        proposal: resolvedInput.proposal,
        account: resolvedInput.account,
        status: 'executed',
        audit_event_ids: [auditEvent.event_id],
        requires_confirmation: false,
      }),
    }
  }
}
