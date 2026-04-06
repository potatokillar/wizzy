import type { AppStartupResult } from '../../../main.js'
import type { AccountMode } from '../../../domain/account/Account.js'
import type { ChatReply } from '../../../application/chat/ChatOrchestrator.js'

export interface TranscriptEntry {
  id: string
  role: 'user' | 'assistant' | 'system'
  kind:
    | 'system_status'
    | 'analysis_reply'
    | 'clarification_required'
    | 'confirmation_required'
    | 'execution_result'
    | 'review_result'
    | 'unsupported_request'
    | 'user'
  text: string
  missing_fields?: string[]
}

export interface MinimalTuiState {
  startup: {
    ready: boolean
    degraded: boolean
    warnings: string[]
  }
  accountSummary: {
    activeAccountId: string | null
    mode: AccountMode | null
  }
  transcript: TranscriptEntry[]
  draft: string
  isSubmitting: boolean
}

export type MinimalTuiAction =
  | { type: 'draft/set'; value: string }
  | { type: 'submit/start'; userEntry: TranscriptEntry }
  | { type: 'submit/finish'; replyEntry: TranscriptEntry }
  | { type: 'submit/error'; errorEntry: TranscriptEntry }

function deriveMode(startup: AppStartupResult): AccountMode | null {
  const activeAccountId = startup.app.sessionContext.getActiveAccount()
  if (!activeAccountId) {
    return null
  }

  const account = startup.app.config.accounts.find((item) => item.id === activeAccountId)
  return account?.mode ?? null
}

export function createTranscriptEntry(
  input: Omit<TranscriptEntry, 'id'> & { id?: string },
): TranscriptEntry {
  return {
    id: input.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...input,
  }
}

export function createReplyTranscriptEntry(reply: ChatReply): TranscriptEntry {
  return createTranscriptEntry({
    role: 'assistant',
    kind: reply.type,
    text: reply.text,
    missing_fields: 'missing_fields' in reply ? reply.missing_fields : undefined,
  })
}

export function createInitialTuiState(startup: AppStartupResult): MinimalTuiState {
  const activeAccountId = startup.app.sessionContext.getActiveAccount()
  const warnings = startup.warnings
  const transcript: TranscriptEntry[] = [
    createTranscriptEntry({
      role: 'system',
      kind: 'system_status',
      text: startup.ready
        ? `Wizzy ready${startup.degraded ? ' (degraded)' : ''}.`
        : 'Wizzy is not ready.',
    }),
  ]

  if (warnings.length > 0) {
    transcript.push(
      ...warnings.map((warning) =>
        createTranscriptEntry({
          role: 'system',
          kind: 'system_status',
          text: warning,
        }),
      ),
    )
  }

  return {
    startup: {
      ready: startup.ready,
      degraded: startup.degraded,
      warnings,
    },
    accountSummary: {
      activeAccountId,
      mode: deriveMode(startup),
    },
    transcript,
    draft: '',
    isSubmitting: false,
  }
}

export function tuiReducer(state: MinimalTuiState, action: MinimalTuiAction): MinimalTuiState {
  switch (action.type) {
    case 'draft/set':
      return {
        ...state,
        draft: action.value,
      }
    case 'submit/start':
      return {
        ...state,
        draft: '',
        isSubmitting: true,
        transcript: [...state.transcript, action.userEntry],
      }
    case 'submit/finish':
      return {
        ...state,
        isSubmitting: false,
        transcript: [...state.transcript, action.replyEntry],
      }
    case 'submit/error':
      return {
        ...state,
        isSubmitting: false,
        transcript: [...state.transcript, action.errorEntry],
      }
  }
}
