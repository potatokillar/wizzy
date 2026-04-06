export type ChatIntent =
  | 'account_control'
  | 'market_understanding'
  | 'trade_action'
  | 'task_delegation'
  | 'review_audit'
  | 'unknown'

export function classifyIntent(message: string): ChatIntent {
  const normalized = message.trim().toLowerCase()

  if (normalized.includes('switch') && normalized.includes('account')) {
    return 'account_control'
  }

  if (
    normalized.includes('open ') ||
    normalized.includes('buy ') ||
    normalized.includes('sell ') ||
    normalized.includes('long') ||
    normalized.includes('short') ||
    normalized.includes('cancel') ||
    normalized.includes('close') ||
    normalized.includes('reduce')
  ) {
    return 'trade_action'
  }

  if (normalized.includes('review') || normalized.includes('why')) {
    return 'review_audit'
  }

  if (normalized.includes('watch') || normalized.includes('monitor')) {
    return 'task_delegation'
  }

  if (normalized.includes('market') || normalized.includes('strong') || normalized.includes('weak')) {
    return 'market_understanding'
  }

  return 'unknown'
}
