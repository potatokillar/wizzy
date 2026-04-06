import type { Account } from '../../domain/account/Account.js'
import { createProposal } from '../../domain/trading/TradeProposal.js'
import type { ExecutionWorkflow } from '../execution/ExecutionWorkflow.js'
import type { ReviewService } from '../review/ReviewService.js'
import type { SessionContextService } from '../session/SessionContextService.js'
import type { TradingStateProvider } from '../state/TradingStateProvider.js'
import { classifyIntent } from './IntentClassifier.js'
import { parseTradeRequest } from './TradeRequestParser.js'

export interface ChatReplyBase {
  text: string
}

export interface ClarificationReply extends ChatReplyBase {
  type: 'clarification_required'
  missing_fields: string[]
}

export interface ProposalReply extends ChatReplyBase {
  type: 'confirmation_required' | 'execution_result' | 'unsupported_request'
}

export interface InformationalReply extends ChatReplyBase {
  type: 'analysis_reply' | 'unsupported_request' | 'review_result'
}

export type ChatReply = ClarificationReply | ProposalReply | InformationalReply

export interface ChatOrchestratorInput {
  accounts: Account[]
  sessionContext: SessionContextService
  executionWorkflow: ExecutionWorkflow
  tradingStateProvider: TradingStateProvider
  reviewService: ReviewService
}

function findAccount(accounts: Account[], accountId: string | null): Account | null {
  if (!accountId) {
    return null
  }

  return accounts.find((account) => account.id === accountId) ?? null
}
export class ChatOrchestrator {
  readonly #accounts: Account[]
  readonly #sessionContext: SessionContextService
  readonly #executionWorkflow: ExecutionWorkflow
  readonly #tradingStateProvider: TradingStateProvider
  readonly #reviewService: ReviewService

  constructor(input: ChatOrchestratorInput) {
    this.#accounts = input.accounts
    this.#sessionContext = input.sessionContext
    this.#executionWorkflow = input.executionWorkflow
    this.#tradingStateProvider = input.tradingStateProvider
    this.#reviewService = input.reviewService
  }

  async #handleReviewMessage(message: string): Promise<ChatReply> {
    const proposalIdMatch = message.trim().match(/\bproposal\s+([a-zA-Z0-9_-]+)\b/i)

    if (!proposalIdMatch?.[1]) {
      return {
        type: 'unsupported_request',
        text: 'Use `review proposal <proposal_id>` for the current MVP review flow.',
      }
    }

    return {
      type: 'review_result',
      text: await this.#reviewService.reviewProposal(proposalIdMatch[1]),
    }
  }

  async handleMessage(message: string): Promise<ChatReply> {
    const intent = classifyIntent(message)

    if (intent === 'review_audit') {
      return this.#handleReviewMessage(message)
    }

    if (intent !== 'trade_action') {
      return { type: 'analysis_reply', text: 'This MVP path currently handles trade-action requests first.' }
    }

    if (!this.#sessionContext.canRunExecutionFlow()) {
      return {
        type: 'unsupported_request',
        text: 'Select an account before requesting an execution-capable action.',
      }
    }

    const activeAccount = findAccount(this.#accounts, this.#sessionContext.getActiveAccount())

    if (!activeAccount) {
      return {
        type: 'unsupported_request',
        text: 'The active account could not be resolved from local config.',
      }
    }

    const parseResult = parseTradeRequest(message, activeAccount)

    if (parseResult.type === 'unsupported_request') {
      return {
        type: 'unsupported_request',
        text: parseResult.reason,
      }
    }

    if (parseResult.type === 'clarification_required') {
      return {
        type: 'clarification_required',
        text: parseResult.question,
        missing_fields: parseResult.missing_fields,
      }
    }

    const proposal = createProposal({
      account_id: activeAccount.id,
      account_name: activeAccount.name,
      // The parser must resolve all executable fields before proposal creation to avoid hidden guesses.
      symbol: parseResult.parsed.symbol_hint!,
      market_type: parseResult.parsed.market_type_hint!,
      intent: parseResult.parsed.intent!,
      side:
        parseResult.parsed.direction ??
        // Close/reduce/cancel may not need explicit user-side wording because the execution layer can later bind them to live state.
        'sell',
      order_type: parseResult.parsed.order_type,
      size:
        parseResult.parsed.size_hint ??
        // The current execution slice still requires a concrete size shape, so risk-neutral flows use a placeholder until position-aware sizing exists.
        { type: 'quantity', value: 0 },
      provenance: 'chat',
      rationale_summary: `Chat request: ${message.trim()}`,
      limit_price: parseResult.parsed.limit_price_hint ?? undefined,
      stop_loss: parseResult.parsed.stop_loss_hint ?? undefined,
      take_profit: parseResult.parsed.take_profit_hint ?? undefined,
      selection_scope: parseResult.parsed.selection_scope ?? undefined,
      selection_side: parseResult.parsed.side_hint ?? undefined,
      selection_price: parseResult.parsed.price_hint ?? undefined,
    })

    const tradingState = await this.#tradingStateProvider.getAccountState(activeAccount.id)

    const result = await this.#executionWorkflow.run({
      account: activeAccount,
      proposal,
      open_positions: tradingState.open_positions,
      open_orders: tradingState.open_orders,
      realized_daily_loss_usd: tradingState.realized_daily_loss_usd,
    })

    if (result.status === 'confirmation_required') {
      return {
        type: 'confirmation_required',
        text: `${activeAccount.name} (${activeAccount.mode}) requires confirmation before opening ${proposal.symbol}.`,
      }
    }

    if (result.status === 'executed') {
      return {
        type: 'execution_result',
        text: `${activeAccount.name} (${activeAccount.mode}) executed ${proposal.intent} on ${proposal.symbol}.`,
      }
    }

    if (result.decision.reason_code === 'multiple_open_orders_match') {
      return {
        type: 'clarification_required',
        text: `${result.decision.reason_human ?? 'More than one order matches.'} Specify price or side.`,
        missing_fields: ['price_or_side'],
      }
    }

    return {
      type: 'execution_result',
      text: `${activeAccount.name} (${activeAccount.mode}) rejected ${proposal.symbol}: ${result.decision.reason_human ?? 'unknown reason'}.`,
    }
  }
}
