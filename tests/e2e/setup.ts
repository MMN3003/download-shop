import { spawn, type ChildProcess } from 'node:child_process'
import { createWriteStream, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TestProject } from 'vitest/node'

declare module 'vitest' {
  export interface ProvidedContext { baseUrl: string, serverLog: string, mockUrl: string }
}

/**
 * Starts the ZarinPal mock and `nuxt dev` on spare ports, with login codes in the log.
 * To test a server you already run, set E2E_BASE_URL and E2E_SERVER_LOG (the file its output goes to);
 * that server needs ZARINPAL_BASE_URL and TOROBPAY_BASE_URL pointing at `node tests/payment-mock.mjs` (E2E_MOCK_URL),
 * and TOROBPAY_* login values (any).
 */
export default async function setup(project: TestProject) {
  if (process.env.E2E_BASE_URL) {
    if (!process.env.E2E_SERVER_LOG) throw new Error('Set E2E_SERVER_LOG to the file the server logs to, so the tests can read login codes')
    project.provide('baseUrl', process.env.E2E_BASE_URL.replace(/\/$/, ''))
    project.provide('serverLog', process.env.E2E_SERVER_LOG)
    project.provide('mockUrl', process.env.E2E_MOCK_URL || 'http://localhost:4010')
    return
  }
  const port = Number(process.env.E2E_PORT) || 3100
  const mockPort = Number(process.env.E2E_MOCK_PORT) || 4110
  const serverLog = join(tmpdir(), `digimarket-e2e-${port}.log`)
  writeFileSync(serverLog, '')
  const log = createWriteStream(serverLog, { flags: 'a' })
  const children: ChildProcess[] = []
  // Without vitest's own variables, or the server thinks it is under test and hides its info logs (the login codes)
  const base = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(VITEST|TEST$)/.test(k)))
  const start = (cmd: string, args: string[], env: Record<string, string>) => {
    const child = spawn(cmd, args, { env: { ...base, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
    child.stdout!.pipe(log, { end: false })
    child.stderr!.pipe(log, { end: false })
    children.push(child)
    return child
  }
  start(process.execPath, ['tests/payment-mock.mjs'], { PORT: String(mockPort) })
  const server = start(process.execPath, ['node_modules/nuxt/bin/nuxt.mjs', 'dev', '--port', String(port)], {
    NODE_ENV: 'development', LOG_OTP_CODES: 'true', ZARINPAL_BASE_URL: `http://localhost:${mockPort}`, SITE_URL: `http://localhost:${port}`,
    TOROBPAY_BASE_URL: `http://localhost:${mockPort}`, TOROBPAY_CLIENT_ID: 'e2e', TOROBPAY_CLIENT_SECRET: 'e2e', TOROBPAY_USERNAME: 'e2e', TOROBPAY_PASSWORD: 'e2e',
  })

  const baseUrl = `http://localhost:${port}`
  const deadline = Date.now() + 200_000
  for (;;) {
    if (server.exitCode !== null) throw new Error(`The server stopped while starting; see ${serverLog}`)
    try {
      // The home page compiles the app, so the first test doesn't wait for it
      if ((await fetch(`${baseUrl}/api/store`)).ok && (await fetch(baseUrl)).ok) break
    }
    catch {}
    if (Date.now() > deadline) throw new Error(`The server did not start; see ${serverLog}`)
    await new Promise(r => setTimeout(r, 1000))
  }
  project.provide('baseUrl', baseUrl)
  project.provide('serverLog', serverLog)
  project.provide('mockUrl', `http://localhost:${mockPort}`)
  return () => { for (const c of children) c.kill() }
}
