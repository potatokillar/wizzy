import fs from 'node:fs'
import path from 'node:path'

import { CONFIG_ROOT } from './defaultPaths.js'
import {
  AccountsSchema,
  AppConfigSchema,
  StrategiesSchema,
  type LoadedConfig,
  UiSchema,
} from './schema.js'

function readJson(relativePath: string): unknown {
  const absolutePath = path.join(CONFIG_ROOT, relativePath)
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8')) as unknown
}

export function loadConfig(): LoadedConfig {
  return {
    app: AppConfigSchema.parse(readJson('app.json')),
    accounts: AccountsSchema.parse(readJson('accounts.json')),
    strategies: StrategiesSchema.parse(readJson('strategies.json')),
    ui: UiSchema.parse(readJson('ui.json')),
  }
}
