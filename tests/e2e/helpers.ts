import { randomInt } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { inject } from 'vitest'

export const baseUrl = inject('baseUrl')
const serverLog = inject('serverLog')
/** Used only to look up ids the API doesn't return to the buyer (payment ids) and to move time for payouts. */
export const db = new PrismaClient()
export const stamp = `${Date.now()}`
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

let seq = 0
/** A fresh Iranian mobile number for each new user. */
export const newPhone = () => `0912${String(randomInt(0, 10_000_000)).padStart(7, '0')}`
export const newEmail = (who: string) => `${who}-${stamp}-${seq++}@example.com`

export type Res = { status: number, data: any, headers: Headers, bytes: Uint8Array }
export type Client = (path: string, opts?: { method?: string, body?: unknown, form?: FormData, headers?: Record<string, string> }) => Promise<Res>

/** A browser-like client that keeps its own cookies. */
export function client(): Client {
  let cookie = ''
  return async (path, { method = 'GET', body, form, headers } = {}) => {
    const r = await fetch(baseUrl + path, {
      method,
      redirect: 'manual',
      headers: { cookie, ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    })
    for (const c of r.headers.getSetCookie()) {
      const kv = c.split(';')[0]!
      const name = kv.split('=')[0]
      cookie = [...cookie.split('; ').filter(x => x && !x.startsWith(`${name}=`)), kv].join('; ')
    }
    const bytes = new Uint8Array(await r.arrayBuffer())
    const text = new TextDecoder().decode(bytes)
    let data: any = text
    try { data = JSON.parse(text) }
    catch {}
    return { status: r.status, data, headers: r.headers, bytes }
  }
}

const logSize = () => statSync(serverLog).size
/** The login code the server printed for `target` after `from` bytes of its log. */
async function codeFor(target: string, from: number) {
  const pattern = new RegExp(`\\[otp\\] \\w+ code for ${target.replace(/[.+]/g, '\\$&')}: (\\d{6})`)
  for (let i = 0; i < 50; i++) {
    const m = readFileSync(serverLog).subarray(from).toString('utf8').match(pattern)
    if (m) return m[1]!
    await sleep(100)
  }
  throw new Error(`No login code for ${target} in ${serverLog}`)
}

/** Ask for a code and return it (read from the server log, as a developer would). */
export async function requestCode(c: Client, target: string) {
  const from = logSize()
  const r = await c('/api/auth/otp/request', { method: 'POST', body: { target } })
  if (r.status !== 200) throw new Error(`Code request for ${target}: ${r.status} ${JSON.stringify(r.data)}`)
  // The log shows the number as the server stores it (09…), whatever form was typed
  return codeFor(r.data.target, from)
}

/** Sign up or log in with a code sent to a phone or email. */
export async function loginWithCode(c: Client, target: string) {
  const code = await requestCode(c, target)
  const r = await c('/api/auth/otp/verify', { method: 'POST', body: { target, code } })
  if (r.status !== 200) throw new Error(`Code login for ${target}: ${r.status} ${JSON.stringify(r.data)}`)
  return r.data as { ok: true, created: boolean, role: string }
}

export async function loginAdmin(c: Client) {
  const r = await c('/api/auth/login', { method: 'POST', body: { email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com', password: process.env.SEED_ADMIN_PASSWORD || 'admin1234' } })
  if (r.status !== 200) throw new Error(`Admin login failed (${r.status}); run pnpm db:seed first`)
}

/** A published product of the first product type, with its required fields filled. */
export async function createProduct(admin: Client, name: string, price: number, extra: Record<string, unknown> = {}) {
  const types = (await admin('/api/admin/product-types')).data as any[]
  const type = types.find(t => t.key === 'anki-deck') ?? types[0]
  const attributes: Record<string, unknown> = {}
  for (const a of type.attributes) {
    if (!a.required || a.autoFilled) continue
    attributes[a.key] = a.kind === 'MULTISELECT' ? [a.options[0].value] : a.kind === 'SELECT' ? a.options[0].value : a.kind === 'NUMBER' ? 1 : a.kind === 'BOOLEAN' ? true : 'x'
  }
  const r = await admin('/api/admin/products', {
    method: 'POST',
    body: { slug: `e2e-${name}-${stamp}`, productTypeId: type.id, status: 'PUBLISHED', title: { fa: `محصول ${name} ${stamp}`, en: `E2E ${name} ${stamp}` }, description: { fa: '<p>توضیح</p>' }, price, attributes, ...extra },
  })
  if (r.status !== 200) throw new Error(`Create product ${name}: ${r.status} ${JSON.stringify(r.data)}`)
  return r.data as { id: string, slug: string, status: string, featured: boolean, sellerId: string | null, description: unknown }
}

export async function uploadFile(c: Client, productId: string, filename: string, data: Uint8Array, kind = 'MAIN') {
  const form = new FormData()
  form.append('file', new Blob([data]), filename)
  form.append('kind', kind)
  return c(`/api/admin/products/${productId}/files`, { method: 'POST', form })
}

/** Check out with ZarinPal and come back from the (mock) gateway as paid. */
export async function payWithZarinpal(c: Client, body: Record<string, unknown>) {
  const r = await c('/api/checkout', { method: 'POST', body: { ...body, method: 'zarinpal' } })
  if (r.status !== 200) return r
  const authority = String(r.data.next ?? '').match(/A\d+0*/)?.[0]
  if (!authority) throw new Error(`No gateway redirect: ${JSON.stringify(r.data)}`)
  const payment = await db.payment.findFirstOrThrow({ where: { authority } })
  const back = await c(`/api/payments/zarinpal/callback?p=${payment.id}&Authority=${authority}&Status=OK`)
  if (back.status >= 400) throw new Error(`Gateway callback: ${back.status}`)
  return r
}

/** Change store settings for one test and put them back afterwards. */
export async function withSettings(admin: Client, change: (s: any) => any, run: () => Promise<void>) {
  const { logoUrl, ...before } = (await admin('/api/admin/settings')).data
  const r = await admin('/api/admin/settings', { method: 'PUT', body: change(structuredClone(before)) })
  if (r.status !== 200) throw new Error(`Settings: ${r.status} ${JSON.stringify(r.data)}`)
  try { await run() }
  finally { await admin('/api/admin/settings', { method: 'PUT', body: before }) }
}

/** Tags and event handlers that must never come back from the API. */
export const XSS = '<script>alert(1)</script><img src=x onerror=alert(1)>'
export const hasMarkup = (v: unknown) => /[<>]/.test(typeof v === 'string' ? v : JSON.stringify(v))
export const hasScript = (v: unknown) => /<script|onerror|onclick|javascript:|<iframe/i.test(typeof v === 'string' ? v : JSON.stringify(v))

/** A 1×1 PNG, for receipts and images. */
export const PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'))
