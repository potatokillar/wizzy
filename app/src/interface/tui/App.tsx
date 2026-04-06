import React, { startTransition, useEffect, useReducer } from 'react'
import { Box, useApp, useInput } from 'ink'

import type { AppStartupResult } from '../../main.js'
import {
  createInitialTuiState,
  createReplyTranscriptEntry,
  createTranscriptEntry,
  tuiReducer,
} from './state/TuiStore.js'
import { Header } from './components/Header.js'
import { PromptInput } from './components/PromptInput.js'
import { Transcript } from './components/Transcript.js'

export interface AppProps {
  startup: AppStartupResult
  interactive?: boolean
  autoSubmitMessages?: string[]
}

function InteractiveInputController(props: {
  draft: string
  isSubmitting: boolean
  onDraftChange: (draft: string) => void
  onSubmit: (message: string) => void
  onExit: () => void
}) {
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      props.onExit()
      return
    }

    if (key.return) {
      const message = props.draft.trim()

      if (props.isSubmitting || message.length === 0) {
        return
      }

      props.onSubmit(message)
      return
    }

    if (key.backspace || key.delete) {
      props.onDraftChange(props.draft.slice(0, -1))
      return
    }

    if (!key.ctrl && !key.meta && input) {
      props.onDraftChange(`${props.draft}${input}`)
    }
  })

  return null
}

export function App({ startup, interactive = true, autoSubmitMessages = [] }: AppProps) {
  const [state, dispatch] = useReducer(tuiReducer, startup, createInitialTuiState)
  const { exit } = useApp()

  const submitMessage = (message: string) => {
    const userEntry = createTranscriptEntry({
      role: 'user',
      kind: 'user',
      text: message,
    })

    dispatch({ type: 'submit/start', userEntry })

    void startup.app.chatOrchestrator
      .handleMessage(message)
      .then((reply) => {
        startTransition(() => {
          dispatch({
            type: 'submit/finish',
            replyEntry: createReplyTranscriptEntry(reply),
          })
        })
      })
      .catch((error: unknown) => {
        dispatch({
          type: 'submit/error',
          errorEntry: createTranscriptEntry({
            role: 'system',
            kind: 'system_status',
            // Surface unexpected failures clearly without hiding the existing transcript or draft history.
            text: error instanceof Error ? error.message : 'Unexpected TUI submission error.',
          }),
        })
      })
  }

  useEffect(() => {
    if (interactive || autoSubmitMessages.length === 0 || state.isSubmitting) {
      return
    }

    const nextMessage = autoSubmitMessages[state.transcript.filter((entry) => entry.role === 'user').length]
    if (!nextMessage) {
      return
    }

    submitMessage(nextMessage)
  }, [autoSubmitMessages, interactive, state.isSubmitting, state.transcript, startup.app.chatOrchestrator])

  const setDraft = (draft: string) => {
    dispatch({
      type: 'draft/set',
      value: draft,
    })
  }

  return (
    <Box flexDirection="column">
      {interactive ? (
        <InteractiveInputController
          draft={state.draft}
          isSubmitting={state.isSubmitting}
          onDraftChange={setDraft}
          onSubmit={submitMessage}
          onExit={exit}
        />
      ) : null}
      <Header state={state} />
      <Transcript entries={state.transcript} />
      <PromptInput draft={state.draft} isSubmitting={state.isSubmitting} />
    </Box>
  )
}
