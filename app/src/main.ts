import { loadConfig } from './config/loadConfig.js'
import { DEFAULT_DB_PATH } from './config/defaultPaths.js'
import { ChatOrchestrator } from './application/chat/ChatOrchestrator.js'
import { ExecutionWorkflow, type ExecutionAdapter } from './application/execution/ExecutionWorkflow.js'
import { ReviewService } from './application/review/ReviewService.js'
import { SessionContextService } from './application/session/SessionContextService.js'
import { InMemoryAuditRepository, SqliteAuditRepository } from './infrastructure/persistence/AuditRepository.js'
import { createDatabase } from './infrastructure/persistence/Database.js'
import { InMemoryTradingStateProvider } from './infrastructure/state/InMemoryTradingStateProvider.js'
import { renderApp } from './interface/tui/renderApp.js'
import type { Account } from './domain/account/Account.js'

class StubExecutionAdapter implements ExecutionAdapter {
  async execute() {
    // The app container wires a deterministic adapter first; exchange connectivity comes later behind the same interface.
    return { execution_id: `stub-${Date.now()}` }
  }
}

export interface AppContainer {
  startedAt: string
  config: ReturnType<typeof loadConfig>
  auditRepository: InMemoryAuditRepository | SqliteAuditRepository
  tradingStateProvider: InMemoryTradingStateProvider
  sessionContext: SessionContextService
  executionWorkflow: ExecutionWorkflow
  chatOrchestrator: ChatOrchestrator
  reviewService: ReviewService
}

export interface AppStartupResult {
  started: boolean
  ready: boolean
  degraded: boolean
  warnings: string[]
  app: AppContainer
}

export function buildApp(): AppContainer {
  const config = loadConfig()
  const database = createDatabase(DEFAULT_DB_PATH)
  const auditRepository = new SqliteAuditRepository(database)
  const tradingStateProvider = new InMemoryTradingStateProvider()
  const sessionContext = new SessionContextService({
    defaultAccount: config.app.default_account,
  })
  const executionWorkflow = new ExecutionWorkflow({
    auditRepository,
    executionAdapter: new StubExecutionAdapter(),
  })
  const reviewService = new ReviewService(auditRepository)
  const chatOrchestrator = new ChatOrchestrator({
    accounts: config.accounts as Account[],
    sessionContext,
    executionWorkflow,
    tradingStateProvider,
    reviewService,
  })

  return {
    // Keep the bootstrap explicit so later service wiring can grow without changing startup semantics.
    startedAt: new Date().toISOString(),
    config,
    auditRepository,
    tradingStateProvider,
    sessionContext,
    executionWorkflow,
    chatOrchestrator,
    reviewService,
  }
}

export async function startApp(): Promise<AppStartupResult> {
  const app = buildApp()

  // Keep startup sequencing explicit even while runtime restore steps are still minimal.
  return {
    started: true,
    ready: true,
    degraded: false,
    warnings: [],
    app,
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const startup = await startApp()
  renderApp(startup)
}
