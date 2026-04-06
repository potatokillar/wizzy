import type { Account } from '../../domain/account/Account.js'
import type { MarketType } from '../../domain/risk/RiskPolicy.js'
import type {
  OrderType,
  OrderSelectionScope,
  ProposalIntent,
  ProposalSize,
  ProtectiveInstruction,
  TradeSide,
} from '../../domain/trading/TradeProposal.js'

export interface ParsedTradeIntent {
  account_ref: string
  symbol_hint: string | null
  market_type_hint: MarketType | null
  direction: TradeSide | null
  intent: ProposalIntent | null
  order_type: OrderType
  size_hint: ProposalSize | null
  limit_price_hint: number | null
  stop_loss_hint: ProtectiveInstruction | null
  take_profit_hint: ProtectiveInstruction | null
  side_hint: TradeSide | null
  price_hint: number | null
  selection_scope: OrderSelectionScope | null
  source_text: string
  ambiguities: string[]
}

export type TradeParseResult =
  | {
      type: 'proposal_ready'
      parsed: ParsedTradeIntent
    }
  | {
      type: 'clarification_required'
      missing_fields: string[]
      question: string
      parsed: ParsedTradeIntent
    }
  | {
      type: 'unsupported_request'
      reason: string
      parsed: ParsedTradeIntent
    }

function normalizeMessage(message: string): string {
  return message.trim().toLowerCase()
}

function inferSymbol(message: string, account: Account): { symbol: string | null; ambiguous: boolean } {
  const supportedSymbols = account.risk_policy.allowed_symbols
  const hasBtc = /\bbtc\b/.test(message)
  const hasEth = /\beth\b/.test(message)

  if (hasBtc && hasEth) {
    return { symbol: null, ambiguous: true }
  }

  if (hasBtc) {
    return {
      symbol: supportedSymbols.find((symbol) => symbol.startsWith('BTC-')) ?? null,
      ambiguous: false,
    }
  }

  if (hasEth) {
    return {
      symbol: supportedSymbols.find((symbol) => symbol.startsWith('ETH-')) ?? null,
      ambiguous: false,
    }
  }

  return { symbol: null, ambiguous: false }
}

function inferMarketType(message: string, account: Account, symbolHint: string | null): MarketType | null {
  if (/\bspot\b/.test(message)) {
    return 'spot'
  }

  if (/\b(perp|swap|perpetual)\b/.test(message)) {
    return 'perpetual'
  }

  // If the account only permits one market type, the parser may safely inherit it.
  if (account.risk_policy.allowed_market_types.length === 1) {
    return account.risk_policy.allowed_market_types[0] ?? null
  }

  if (symbolHint?.endsWith('-SWAP')) {
    return 'perpetual'
  }

  return null
}

function inferDirection(message: string): TradeSide | null {
  if (/\b(short|sell)\b/.test(message)) {
    return 'sell'
  }

  if (/\b(long|buy)\b/.test(message)) {
    return 'buy'
  }

  return null
}

function inferIntent(message: string): ProposalIntent | null {
  if (/\bcancel\b/.test(message)) {
    return 'cancel'
  }

  if (/\b(close|exit|flatten)\b/.test(message)) {
    return 'close'
  }

  if (/\b(trim|reduce)\b/.test(message)) {
    return 'reduce'
  }

  if (/\b(add|increase)\b/.test(message)) {
    return 'increase'
  }

  if (/\b(open|buy|sell|long|short)\b/.test(message)) {
    return 'open'
  }

  return null
}

function inferOrderType(message: string): OrderType {
  return /\blimit\b/.test(message) ? 'limit' : 'market'
}

function inferLimitPrice(message: string, orderType: OrderType): number | null {
  if (orderType !== 'limit') {
    return null
  }

  const priceMatch =
    message.match(/\b(?:at|@)\s*(\d+(?:\.\d+)?)\b/) ??
    message.match(/\blimit\s*(?:at|@)?\s*(\d+(?:\.\d+)?)\b/)

  return priceMatch?.[1] ? Number(priceMatch[1]) : null
}

function inferCancelPriceHint(message: string): number | null {
  const explicitPrice =
    message.match(/\b(\d+(?:\.\d+)?)\b(?=.*\b(?:bid|ask|order|limit)\b)/) ??
    message.match(/\b(?:at|@)\s*(\d+(?:\.\d+)?)\b/)

  return explicitPrice?.[1] ? Number(explicitPrice[1]) : null
}

function inferSize(message: string): { size: ProposalSize | null; needsClarification: boolean } {
  // Avoid treating price-like numbers after "at" or "@" as order size.
  const sanitized = message.replace(/\b(?:at|@)\s*\d+(?:\.\d+)?\b/g, '')
  const usdMatch = sanitized.match(/(?:\$|usdt\s*|usd\s*)?(\d+(?:\.\d+)?)\s*(?:u|usdt|usd)?\b/)

  if (usdMatch?.[1]) {
    return {
      size: { type: 'notional_usd', value: Number(usdMatch[1]) },
      needsClarification: false,
    }
  }

  if (/\b(small|probe|starter)\b/.test(message)) {
    // Subjective sizing words are intentionally non-executable until config-backed presets exist.
    return { size: null, needsClarification: true }
  }

  return { size: null, needsClarification: true }
}

function inferProtection(
  message: string,
  kind: 'stop_loss' | 'take_profit',
): ProtectiveInstruction | null {
  const patterns =
    kind === 'stop_loss'
      ? [/\b(?:sl|stop(?:\s+at)?)\s*(\d+(?:\.\d+)?)\b/, /\bstop\s+loss\s*(?:at)?\s*(\d+(?:\.\d+)?)\b/]
      : [/\b(?:tp|take\s+profit(?:\s+at)?)\s*(\d+(?:\.\d+)?)\b/, /\btake\s+profit\s*(?:at)?\s*(\d+(?:\.\d+)?)\b/]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match?.[1]) {
      return {
        kind,
        trigger_price: Number(match[1]),
      }
    }
  }

  return null
}

function inferSelectionScope(message: string): OrderSelectionScope | null {
  if (/\bcancel\s+all\s+open\s+orders\b/.test(message)) {
    return 'all_for_account'
  }

  if (/\bcancel\s+all\b/.test(message)) {
    return 'all_for_symbol'
  }

  if (/\bcancel\b/.test(message)) {
    return 'single_best_match'
  }

  return null
}

function inferOrderSideHint(message: string): TradeSide | null {
  if (/\b(ask|sell)\b/.test(message)) {
    return 'sell'
  }

  if (/\b(bid|buy)\b/.test(message)) {
    return 'buy'
  }

  return null
}

function buildClarificationQuestion(missingFields: string[]): string {
  if (missingFields.includes('size')) {
    return 'Specify an exact order size, for example `$100`, before I create a trade proposal.'
  }

  if (missingFields.includes('symbol')) {
    return 'Specify exactly one symbol before I create a trade proposal.'
  }

  if (missingFields.includes('market_type')) {
    return 'Specify whether this should be spot or perpetual.'
  }

  if (missingFields.includes('direction')) {
    return 'Specify whether you want to buy/long or sell/short.'
  }

  if (missingFields.includes('limit_price')) {
    return 'Specify the limit price, for example `limit at 81200`.'
  }

  return 'Clarify the missing trade fields before I create a proposal.'
}

export function parseTradeRequest(message: string, account: Account): TradeParseResult {
  const normalized = normalizeMessage(message)

  if (/,.*\b(and|then)\b/.test(normalized)) {
    return {
      type: 'unsupported_request',
      reason: 'Compound multi-action trade instructions are not supported in the deterministic MVP parser.',
      parsed: {
        account_ref: account.id,
        symbol_hint: null,
        market_type_hint: null,
        direction: null,
        intent: null,
        order_type: 'market',
        size_hint: null,
        limit_price_hint: null,
        stop_loss_hint: null,
        take_profit_hint: null,
        side_hint: null,
        price_hint: null,
        selection_scope: null,
        source_text: message,
        ambiguities: ['compound_instruction'],
      },
    }
  }

  const symbolResult = inferSymbol(normalized, account)
  const symbolHint = symbolResult.symbol
  const marketTypeHint = inferMarketType(normalized, account, symbolHint)
  const direction = inferDirection(normalized)
  const intent = inferIntent(normalized)
  const orderType = inferOrderType(normalized)
  const limitPriceHint = inferLimitPrice(normalized, orderType)
  const sizeResult = inferSize(normalized)
  const stopLossHint = inferProtection(normalized, 'stop_loss')
  const takeProfitHint = inferProtection(normalized, 'take_profit')
  const selectionScope = intent === 'cancel' ? inferSelectionScope(normalized) : null
  const sideHint = intent === 'cancel' ? inferOrderSideHint(normalized) : null
  const priceHint = intent === 'cancel' ? inferCancelPriceHint(normalized) : null

  const parsed: ParsedTradeIntent = {
    account_ref: account.id,
    symbol_hint: symbolHint,
    market_type_hint: marketTypeHint,
    direction,
    intent,
    order_type: orderType,
    size_hint: sizeResult.size,
    limit_price_hint: limitPriceHint,
    stop_loss_hint: stopLossHint,
    take_profit_hint: takeProfitHint,
    side_hint: sideHint,
    price_hint: priceHint,
    selection_scope: selectionScope,
    source_text: message,
    ambiguities: [],
  }

  const missingFields: string[] = []

  if (symbolResult.ambiguous || !symbolHint) {
    missingFields.push('symbol')
  }

  if (!marketTypeHint) {
    missingFields.push('market_type')
  }

  if (!direction && intent !== 'cancel' && intent !== 'close' && intent !== 'reduce') {
    missingFields.push('direction')
  }

  if (!intent) {
    missingFields.push('intent')
  }

  if (orderType === 'limit' && limitPriceHint === null && intent !== 'cancel') {
    missingFields.push('limit_price')
  }

  if (intent === 'cancel') {
    if (selectionScope === 'all_for_account' || selectionScope === 'all_for_symbol') {
      return {
        type: 'unsupported_request',
        reason: 'Bulk cancel is not implemented in the current MVP.',
        parsed,
      }
    }
  } else if (intent === 'close' || intent === 'reduce') {
    // Close and reduce can infer market-side behavior from live positions later, so size is optional for now.
  } else if (intent === 'open' || intent === 'increase') {
    if (!sizeResult.size || sizeResult.needsClarification) {
      missingFields.push('size')
    }
  }

  if (missingFields.length > 0) {
    parsed.ambiguities = missingFields

    return {
      type: 'clarification_required',
      missing_fields: missingFields,
      question: buildClarificationQuestion(missingFields),
      parsed,
    }
  }

  return {
    type: 'proposal_ready',
    parsed,
  }
}
