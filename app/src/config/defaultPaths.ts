import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url))

// Resolve from src/config back to the app root so runtime paths stay stable.
export const APP_ROOT = path.resolve(CURRENT_DIR, '../..')
export const DATA_ROOT = path.join(APP_ROOT, 'data')
export const CONFIG_ROOT = path.join(DATA_ROOT, 'config')
export const DB_ROOT = path.join(DATA_ROOT, 'db')
export const DEFAULT_DB_PATH = path.join(DB_ROOT, 'wizzy.sqlite')
