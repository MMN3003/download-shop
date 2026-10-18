import { beforeAll, describe, expect, inject, it } from 'vitest'
import { client, createProduct, db, loginAdmin, loginWithCode, newEmail, newPhone, withSettings } from './helpers'

const mock = inject('mockUrl')
const admin = client(), buyer = client()
let big: Awaited<ReturnType<typeof createProduct>>, small: typeof big

const torobCalls = async (path: string) => ((await (await fetch(`${mock}/__torob/log`)).json()) as { path: string, body: any }[]).filter(c => c.path === path)
/** Torob POSTs the result back to the return URL as a form. */
async function torobReturns(number: number, state: 'OK' | 'FAILED') {
  const payment = await db.payment.findFirstOrThrow({ where: { order: { number }, method: 'torobpay' }, orderBy: { createdAt: 'desc' } })
  const form = new URLSearchParams({ transactionId: payment.authority!, state, amount: '0' })
  return buyer(`/api/payments/torobpay/callback?p=${payment.id}&l=fa`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, form: form as any })
}

beforeAll(async () => {
  await loginAdmin(admin)
  await loginWithCode(buyer, newPhone())
  big = await createProduct(admin, 'torob-big', 300000)
  small = await createProduct(admin, 'torob-small', 10000)
})

const torobOn = (s: any) => ({ ...s, currency: 'IRT', payments: { ...s.payments, torobpay: { enabled: true } } })

describe('Torob Pay', () => {
  it('is offered with its installments and minimum, and refuses small orders', async () => {
    await withSettings(admin, torobOn, async () => {
      const m = (await buyer('/api/checkout/methods')).data.find((x: any) => x.key === 'torobpay')
      expect(m.info).toEqual({ installments: '4', minAmount: '20000' })
      const r = await buyer('/api/checkout', { method: 'POST', body: { ids: [small.id], method: 'torobpay' } })
      expect(r.data.error).toBe('This amount is too small for Torob Pay')
    })
  })

  it('needs a mobile number on the account', async () => {
    await withSettings(admin, torobOn, async () => {
      const emailOnly = client()
      await loginWithCode(emailOnly, newEmail('torob'))
      const r = await emailOnly('/api/checkout', { method: 'POST', body: { ids: [big.id], method: 'torobpay' } })
      expect(r.data.error).toBe('Add a mobile number to your account to pay with Torob Pay')
    })
  })

  it('pays in Rial, verifies and settles, then a refund cancels it at Torob', async () => {
    await withSettings(admin, torobOn, async () => {
      const r = await buyer('/api/checkout', { method: 'POST', body: { ids: [big.id], method: 'torobpay' } })
      expect(r.data.next).toMatch(/\/torob\/pay\/T/)
      const sent = (await torobCalls('/api/online/payment/v1/token')).at(-1)!.body
      expect(sent).toMatchObject({ amount: 3_000_000, paymentMethodTypeDto: 'ONLINE_CREDIT' })
      expect(sent.cartList[0].cartItems[0]).toMatchObject({ id: big.id, amount: 3_000_000, count: 1 })

      const back = await torobReturns(r.data.number, 'OK')
      expect(back.status).toBe(303)
      expect(back.headers.get('location')).toBe(`/orders/${r.data.number}?paid=1`)
      expect((await buyer(`/api/orders/${r.data.number}`)).data.status).toBe('PAID')
      expect((await buyer('/api/library')).data.some((i: any) => i.productId === big.id)).toBe(true)
      expect((await torobCalls('/api/online/payment/v1/settle')).length).toBeGreaterThan(0)

      // A second return (refresh, double POST) changes nothing
      expect((await torobReturns(r.data.number, 'OK')).headers.get('location')).toBe(`/orders/${r.data.number}?paid=1`)

      const order = await db.order.findUniqueOrThrow({ where: { number: Number(r.data.number) } })
      const cancels = (await torobCalls('/api/online/payment/v1/cancel')).length
      expect((await admin(`/api/admin/orders/${order.id}/refund`, { method: 'POST', body: {} })).status).toBe(200)
      expect((await torobCalls('/api/online/payment/v1/cancel')).length).toBe(cancels + 1)
      expect((await buyer('/api/library')).data.some((i: any) => i.productId === big.id)).toBe(false)
    })
  })

  it('a failed or forged return does not pay the order', async () => {
    await withSettings(admin, torobOn, async () => {
      const other = createProduct(admin, 'torob-fail', 300000)
      const p = await other
      const r = await buyer('/api/checkout', { method: 'POST', body: { ids: [p.id], method: 'torobpay' } })
      const payment = await db.payment.findFirstOrThrow({ where: { order: { number: Number(r.data.number) } } })
      const forged = new URLSearchParams({ transactionId: 'someone-else', state: 'OK' })
      expect((await buyer(`/api/payments/torobpay/callback?p=${payment.id}`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, form: forged as any })).status).toBe(400)
      expect((await torobReturns(r.data.number, 'FAILED')).headers.get('location')).toBe(`/orders/${r.data.number}?failed=1`)
      expect((await buyer(`/api/orders/${r.data.number}`)).data.status).toBe('PENDING_PAYMENT')
    })
  })

  it('is hidden when switched off', async () => {
    const methods = (await buyer('/api/checkout/methods')).data
    expect(methods.some((m: any) => m.key === 'torobpay')).toBe(false)
  })
})
