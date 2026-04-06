import { describe, expect, it } from 'vitest'

import { startApp } from '../../../src/main.js'

describe('startApp', () => {
  it('builds the app container and reports ready startup state', async () => {
    const result = await startApp()

    expect(result.started).toBe(true)
    expect(result.ready).toBe(true)
    expect(result.degraded).toBe(false)
    expect(result.warnings).toEqual([])
    expect(result.app.chatOrchestrator).toBeDefined()
    expect(result.app.reviewService).toBeDefined()
  })
})
