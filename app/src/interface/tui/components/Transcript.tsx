import React from 'react'
import { Box, Text } from 'ink'

import type { TranscriptEntry } from '../state/TuiStore.js'

export interface TranscriptProps {
  entries: TranscriptEntry[]
}

function labelFor(entry: TranscriptEntry): string {
  switch (entry.role) {
    case 'user':
      return 'You'
    case 'system':
      return 'System'
    case 'assistant':
      return 'Wizzy'
  }
}

export function Transcript({ entries }: TranscriptProps) {
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1} flexGrow={1}>
      <Text>Transcript</Text>
      {entries.map((entry) => (
        <Box key={entry.id} flexDirection="column" marginTop={1}>
          <Text>
            {labelFor(entry)} [{entry.kind}]
          </Text>
          <Text>{entry.text}</Text>
          {entry.missing_fields && entry.missing_fields.length > 0 ? (
            <Text>Missing: {entry.missing_fields.join(', ')}</Text>
          ) : null}
        </Box>
      ))}
    </Box>
  )
}
