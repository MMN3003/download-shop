#!/usr/bin/env node
/**
 * Run a command with the env file for a mode loaded first:
 *   node scripts/with-env.mjs development nuxt dev
 * Loads .env.<mode>, then .env for anything still unset (test mode also reads .env.development). Variables already set
 * in the shell (or by the host in production) always win.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const [mode, cmd, ...args] = process.argv.slice(2)
if (!['development', 'production', 'test'].includes(mode) || !cmd) {
  console.error('Usage: node scripts/with-env.mjs <development|production|test> <command> [...args]')
  process.exit(1)
}
const loaded = []
for (const file of mode === 'test' ? ['.env.test', '.env.development', '.env'] : [`.env.${mode}`, '.env']) {
  if (existsSync(file)) {
    process.loadEnvFile(file)
    loaded.push(file)
  }
}
process.env.NODE_ENV ??= mode === 'test' ? 'development' : mode
console.info(`[env] ${mode}: ${loaded.length ? loaded.join(' + ') : 'no env file found (using the shell environment)'}`)

const child = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' })
child.on('exit', (code, signal) => (signal ? process.kill(process.pid, signal) : process.exit(code ?? 0)))
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => child.kill(s))
