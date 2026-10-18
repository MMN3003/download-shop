import { randomBytes } from 'node:crypto'
import type { Payment } from '@prisma/client'
import type { PaymentMethod } from './types'
import type { StoreSettings } from '../utils/settings'

/**
 * Torob Pay installment checkout (cpg.torobpay.com), ported from carola. Amounts are in Rial.
 *
 * Flow: oauth token → payment/v1/token (we get a paymentToken and send the buyer to its page) →
 * Torob POSTs transactionId/state/amount back to our return URL → verify → settle. Torob refunds an
 * order it holds unverified for 10 minutes, so a lost callback costs the buyer nothing.
 * Credentials are env vars (TOROBPAY_CLIENT_ID, _CLIENT_SECRET, _USERNAME, _PASSWORD);
 * TOROBPAY_BASE_URL points at a mock in tests.
 */
const base = () => process.env.TOROBPAY_BASE_URL || 'https://cpg.torobpay.com'
export const TOROBPAY_MIN_RIAL = 200_000
const INSTALLMENTS = 4

/** Store amounts are in the store currency (Toman or Rial); Torob wants Rial. */
const toRial = (s: StoreSettings, amount: number) => s.currency === 'IRR' ? amount : amount * 10
const minInStoreCurrency = (s: StoreSettings) => s.currency === 'IRR' ? TOROBPAY_MIN_RIAL : TOROBPAY_MIN_RIAL / 10

interface TpError { errorCode?: string | number, code?: string | number, message?: string }
class TorobPayError extends Error {
  constructor(public status: number, public code: string, message: string, public raw: unknown) {
    super(`torobpay ${status} ${code} ${message}`)
  }
}

function credentials() {
  const { TOROBPAY_CLIENT_ID: clientId, TOROBPAY_CLIENT_SECRET: clientSecret, TOROBPAY_USERNAME: username, TOROBPAY_PASSWORD: password } = process.env
  return clientId && clientSecret && username && password ? { clientId, clientSecret, username, password } : null
}
export const torobpayConfigured = () => !!credentials()

/** One retry after a network failure (DNS lookups from Iran fail intermittently); answers are never retried. */
async function send(path: string, init: RequestInit): Promise<{ status: number, body: any }> {
  const once = async () => {
    const res = await fetch(`${base()}${path}`, { ...init, signal: AbortSignal.timeout(15_000) })
    const text = await res.text()
    let body: any = text
    try { body = JSON.parse(text) }
    catch {}
    return { status: res.status, body }
  }
  try { return await once() }
  catch {
    await new Promise(r => setTimeout(r, 800))
    try { return await once() }
    catch { throw createError({ statusCode: 502, message: 'Could not reach Torob Pay. Please try again.' }) }
  }
}

const errorOf = (body: any): TpError | undefined => body?.errorData ?? body?.error

// The access token lasts an hour; one is shared by all requests until shortly before it expires.
let token: { value: string, expiresAt: number, key: string } | null = null

async function accessToken(force = false) {
  const c = credentials()
  if (!c) throw createError({ statusCode: 422, message: 'This payment method is not available' })
  const key = `${c.clientId}:${c.username}`
  if (!force && token?.key === key && token.expiresAt > Date.now() + 60_000) return token.value
  const { status, body } = await send('/api/online/v1/oauth/token', {
    method: 'POST',
    headers: { 'authorization': `Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`).toString('base64')}`, 'content-type': 'application/json', 'accept': 'application/json' },
    body: JSON.stringify({ username: c.username, password: c.password }),
  })
  const value: string | undefined = body?.access_token ?? body?.response?.access_token
  if (!value) {
    const err = errorOf(body)
    throw new TorobPayError(status, String(err?.errorCode ?? err?.code ?? '?'), err?.message ?? 'no access token', body)
  }
  let expiresAt = Date.now() + 3_600_000
  try {
    const claims = JSON.parse(Buffer.from(value.split('.')[1] ?? '', 'base64url').toString()) as { exp?: number }
    if (claims.exp) expiresAt = claims.exp * 1000
  }
  catch {}
  token = { value, expiresAt, key }
  return value
}

/** Authenticated call; a rejected token (401) is renewed once. */
async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const { status, body: res } = await send(path, {
      method,
      headers: { authorization: `Bearer ${await accessToken(attempt > 0)}`, accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (status === 401 && attempt === 0) continue
    if (res?.successful) return res.response as T
    const err = errorOf(res)
    throw new TorobPayError(status, String(err?.errorCode ?? err?.code ?? '?'), err?.message ?? 'request failed', res)
  }
}

const paymentTokenOf = (p: Payment) => (p.raw as any)?.paymentToken as string | undefined

export const torobpayMethod: PaymentMethod = {
  key: 'torobpay',
  kind: 'online',
  name: { fa: 'ترب‌پی (قسطی)', en: 'Torob Pay (installments)' },
  icon: 'i-lucide-calendar-clock',
  enabled: s => s.payments.torobpay.enabled && torobpayConfigured(),
  publicInfo: s => ({ installments: String(INSTALLMENTS), minAmount: String(minInStoreCurrency(s)) }),
  async start({ order, payment, settings, returnUrl }) {
    if (payment.amount < minInStoreCurrency(settings)) throw createError({ statusCode: 422, message: 'This amount is too small for Torob Pay', data: { min: minInStoreCurrency(settings) } })
    if (!order.user.phone) throw createError({ statusCode: 422, message: 'Add a mobile number to your account to pay with Torob Pay' })
    const items = await prisma.orderItem.findMany({ where: { orderId: order.id } })
    const transactionId = `${order.number}-${randomBytes(4).toString('hex')}`
    const res = await call<{ paymentToken: string, paymentPageUrl: string }>('POST', '/api/online/payment/v1/token', {
      amount: toRial(settings, payment.amount),
      discountAmount: toRial(settings, order.discount),
      externalSourceAmount: 0,
      mobile: order.user.phone,
      paymentMethodTypeDto: 'ONLINE_CREDIT',
      returnURL: returnUrl,
      transactionId,
      cartList: [{
        cartId: String(order.number),
        totalAmount: toRial(settings, order.subtotal),
        shippingAmount: 0,
        isShipmentIncluded: true,
        taxAmount: 0,
        isTaxIncluded: true,
        cartItems: items.map(i => ({ id: i.productId, name: String((i.title as any)?.fa || (i.title as any)?.en || i.productId).slice(0, 250), count: 1, amount: toRial(settings, i.unitPrice), category: 'digital', commissionType: 0 })),
      }],
      registration_phone_number: order.user.phone,
      ...(order.user.name ? { customer_full_name: order.user.name } : {}),
    }).catch((e) => {
      if (e instanceof TorobPayError) throw createError({ statusCode: 502, message: `Torob Pay refused the payment (${e.code})` })
      throw e
    })
    if (!res?.paymentToken || !res.paymentPageUrl) throw createError({ statusCode: 502, message: 'Torob Pay refused the payment (empty)' })
    await prisma.payment.update({ where: { id: payment.id }, data: { authority: transactionId, raw: { paymentToken: res.paymentToken } } })
    return { redirect: res.paymentPageUrl }
  },
}

/**
 * Confirm a Torob Pay payment after the buyer returns, then settle it at once (the files are
 * delivered on payment; Torob would settle by itself after 10 minutes anyway).
 */
export async function verifyTorobpay(payment: Payment): Promise<{ ok: boolean, raw: unknown }> {
  const paymentToken = paymentTokenOf(payment)
  if (!paymentToken) return { ok: false, raw: { reason: 'no paymentToken' } }
  let verified: unknown
  try {
    verified = await call('POST', '/api/online/payment/v1/verify', { paymentToken })
  }
  catch (e) {
    if (!(e instanceof TorobPayError)) throw e
    // Not waiting for a verify: it may have been verified or settled already, or never paid
    try {
      const st = await call<{ status: string }>('GET', `/api/online/payment/v1/status?paymentToken=${encodeURIComponent(paymentToken)}`)
      if (st.status === 'SETTLE') return { ok: true, raw: { paymentToken, status: st } }
      if (st.status !== 'VERIFY') return { ok: false, raw: { paymentToken, verify: e.raw, status: st } }
      verified = { status: st }
    }
    catch (s) {
      return { ok: false, raw: { paymentToken, verify: e.raw, status: (s as TorobPayError).raw ?? (s as Error).message } }
    }
  }
  try {
    const settled = await call('POST', '/api/online/payment/v1/settle', { paymentToken })
    return { ok: true, raw: { paymentToken, verify: verified, settle: settled } }
  }
  catch (e) {
    console.error(`torobpay settle ${payment.authority}:`, (e as Error).message)
    return { ok: true, raw: { paymentToken, verify: verified, settle: (e as TorobPayError).raw ?? (e as Error).message } }
  }
}

/** Cancel a paid Torob Pay purchase: Torob returns the money (whole, or the installments paid so far). */
export async function cancelTorobpay(payment: Payment): Promise<{ ok: true, raw: unknown } | { ok: false, code: string }> {
  const paymentToken = paymentTokenOf(payment)
  if (!paymentToken) return { ok: false, code: 'no token' }
  try {
    return { ok: true, raw: await call('POST', '/api/online/payment/v1/cancel', { paymentToken }) }
  }
  catch (e) {
    if (!(e instanceof TorobPayError)) throw e
    return { ok: false, code: e.code }
  }
}
