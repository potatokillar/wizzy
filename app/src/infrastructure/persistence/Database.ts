import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

function readMigration(filename: string): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  return fs.readFileSync(path.join(currentDir, 'migrations', filename), 'utf8')
}

export function createDatabase(filename: string): DatabaseSync {
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(filename), { recursive: true })
  }

  const database = new DatabaseSync(filename)

  // Bootstrap synchronously so repositories can assume the schema exists.
  database.exec(readMigration('001_init.sql'))

  return database
}
