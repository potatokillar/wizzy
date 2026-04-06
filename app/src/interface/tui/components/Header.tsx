import React from 'react'
import { Box, Text } from 'ink'

import type { MinimalTuiState } from '../state/TuiStore.js'

export interface HeaderProps {
  state: MinimalTuiState
}

export function Header({ state }: HeaderProps) {
  const accountLabel = state.accountSummary.activeAccountId ?? 'none'
  const modeLabel = state.accountSummary.mode ?? 'n/a'
  const readinessLabel = state.startup.ready ? 'ready' : 'not-ready'
  const degradedLabel = state.startup.degraded ? 'degraded' : 'healthy'

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text>Wizzy Terminal</Text>
      <Text>
        Account: {accountLabel} | Mode: {modeLabel} | Startup: {readinessLabel} | Status:{' '}
        {degradedLabel}
      </Text>
    </Box>
  )
}
