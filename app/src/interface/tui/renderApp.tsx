import React from 'react'
import { render } from 'ink'

import type { AppStartupResult } from '../../main.js'
import { App } from './App.js'

export function renderApp(startup: AppStartupResult) {
  return render(<App startup={startup} />)
}
