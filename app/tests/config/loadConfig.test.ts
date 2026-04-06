import { describe, expect, it } from 'vitest'

import { loadConfig } from '../../src/config/loadConfig.js'

describe('loadConfig', () => {
  it('loads and validates app config', () => {
    const config = loadConfig()

    expect(config.app.schema_version).toBe(1)
    expect(config.accounts.length).toBeGreaterThan(0)
    expect(config.ui.confirm_before_exit).toBe(true)
  })
})
