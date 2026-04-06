import { describe, expect, it } from 'vitest'

import { classifyIntent } from '../../../src/application/chat/IntentClassifier.js'

describe('classifyIntent', () => {
  it('classifies switch-account as account_control', () => {
    expect(classifyIntent('switch to alpha account')).toBe('account_control')
  })

  it('classifies trade requests as trade_action', () => {
    expect(classifyIntent('open a small BTC long')).toBe('trade_action')
  })
})
