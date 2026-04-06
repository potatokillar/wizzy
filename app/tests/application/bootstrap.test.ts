import { describe, expect, it } from 'vitest'

import { buildApp, startApp } from '../../src/main.js'

describe('buildApp', () => {
  it('creates the application container', () => {
    const app = buildApp()

    expect(app).toBeDefined()
    expect(app.config.app.schema_version).toBe(1)
    expect(app.auditRepository).toBeDefined()
    expect(app.tradingStateProvider).toBeDefined()
    expect(app.sessionContext).toBeDefined()
    expect(app.executionWorkflow).toBeDefined()
    expect(app.chatOrchestrator).toBeDefined()
    expect(app.reviewService).toBeDefined()
  })

  it('supports startup sequencing through startApp', async () => {
    const started = await startApp()

    expect(started.started).toBe(true)
    expect(started.app.executionWorkflow).toBeDefined()
  })
})
