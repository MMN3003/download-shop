import type { PaymentMethod } from './types'
import type { StoreSettings } from '../utils/settings'

const isDev = () => process.env.NODE_ENV !== 'production'
// ZARINPAL_BASE_URL points at a mock gateway in tests; development always uses ZarinPal's sandbox
const sandbox = (s: StoreSettings) => isDev() || s.payments.zarinpal.sandbox
const base = (s: StoreSettings) => process.env.ZARINPAL_BASE_URL || (sandbox(s) ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com')
/** The sandbox accepts any merchant ID shaped like a UUID, so development works without one. */
const merchantId = (s: StoreSettings) => s.payments.zarinpal.merchantId || (sandbox(s) ? '00000000-0000-0000-0000-000000000000' : '')
const currency = (s: StoreSettings) => s.currency === 'IRR' ? 'IRR' : 'IRT'

async function call(url: string, body: object) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20_000) })
    .catch(() => { throw createError({ statusCode: 502, message: 'Could not reach ZarinPal. Please try again.' }) })
  const json = await res.json().catch(() => ({})) as any
  return { code: json?.data?.code as number | undefined, data: json?.data, errors: json?.errors, raw: json }
}

/** ZarinPal online gateway (API v4). */
export const zarinpalMethod: PaymentMethod = {
  key: 'zarinpal',
  kind: 'online',
  name: { fa: 'درگاه زرین‌پال', en: 'ZarinPal (online)' },
  icon: 'i-lucide-zap',
  enabled: s => s.payments.zarinpal.enabled && !!merchantId(s),
  publicInfo: () => ({}),
  async start({ order, payment, settings, returnUrl }) {
    const r = await call(`${base(settings)}/pg/v4/payment/request.json`, {
      merchant_id: merchantId(settings),
      amount: payment.amount,
      currency: currency(settings),
      callback_url: returnUrl,
      description: `Order #${order.number}`,
      metadata: { ...(order.user.phone ? { mobile: order.user.phone } : {}), ...(order.user.email ? { email: order.user.email } : {}), order_id: String(order.number) },
    })
    if (r.code !== 100 || !r.data?.authority) {
      throw createError({ statusCode: 502, message: `ZarinPal refused the payment (${r.errors?.code ?? r.code ?? 'no answer'})` })
    }
    await prisma.payment.update({ where: { id: payment.id }, data: { authority: r.data.authority, raw: r.raw } })
    return { redirect: `${base(settings)}/pg/StartPay/${r.data.authority}` }
  },
}

/** Confirm a ZarinPal payment after the buyer returns. 100 = paid now, 101 = already confirmed. */
export async function verifyZarinpal(settings: StoreSettings, amount: number, authority: string) {
  const r = await call(`${base(settings)}/pg/v4/payment/verify.json`, { merchant_id: merchantId(settings), amount, authority })
  return { ok: r.code === 100 || r.code === 101, refId: r.data?.ref_id ? String(r.data.ref_id) : null, cardPan: r.data?.card_pan ?? null, raw: r.raw }
}
