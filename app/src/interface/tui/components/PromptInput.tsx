import React from 'react'
import { Box, Text } from 'ink'

export interface PromptInputProps {
  draft: string
  isSubmitting: boolean
}

export function PromptInput({ draft, isSubmitting }: PromptInputProps) {
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text>{isSubmitting ? 'Submitting...' : 'Prompt'}</Text>
      <Text>&gt; {draft || ''}</Text>
    </Box>
  )
}
