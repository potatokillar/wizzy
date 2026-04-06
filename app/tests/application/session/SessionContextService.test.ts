import { describe, expect, it } from 'vitest'

import { SessionContextService } from '../../../src/application/session/SessionContextService.js'

describe('SessionContextService', () => {
  it('starts with no active account when default is null', () => {
    const service = new SessionContextService({ defaultAccount: null })

    expect(service.getActiveAccount()).toBeNull()
    expect(service.canRunExecutionFlow()).toBe(false)
  })

  it('switches the active account explicitly', () => {
    const service = new SessionContextService({ defaultAccount: null })

    service.switchAccount('alpha')

    expect(service.getActiveAccount()).toBe('alpha')
    expect(service.canRunExecutionFlow()).toBe(true)
  })
})
