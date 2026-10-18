import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { client, createProduct, db, loginAdmin, loginWithCode, newPhone, payWithZarinpal, PNG, stamp, uploadFile, withSettings } from './helpers'

const admin = client(), buyer = client(), guest = client()
let deck: Awaited<ReturnType<typeof createProduct>>, cheap: typeof deck, free: typeof deck
const apkg = new Uint8Array(readFileSync(new URL('../fixtures/sample.apkg', import.meta.url)))

beforeAll(async () => {
  await loginAdmin(admin)
  await loginWithCode(buyer, newPhone())
  deck = await createProduct(admin, 'deck', 100000)
  cheap = await createProduct(admin, 'cheap', 40000)
  free = await createProduct(admin, 'free', 0, { isFree: true })
  for (const p of [deck, cheap, free]) expect((await uploadFile(admin, p.id, 'deck.apkg', apkg)).status).toBe(200)
})

describe('browse', () => {
  it('finds products by search and opens their page', async () => {
    const r = await guest(`/api/products?q=${stamp}`)
    expect(r.data.items.map((p: any) => p.id)).toEqual(expect.arrayContaining([deck.id, cheap.id, free.id]))
    const page = await guest(`/api/products/${deck.slug}`)
    expect(page.status).toBe(200)
    expect(page.data.product.id).toBe(deck.id)
    expect((await guest(`/p/${deck.slug}`)).status).toBe(200)
  })

  it('filters free products', async () => {
    const r = await guest(`/api/products?q=${stamp}&free=1`)
    expect(r.data.items.map((p: any) => p.id)).toEqual([free.id])
  })

  it('renders the main pages', async () => {
    for (const path of ['/', '/en', '/search', '/cart', '/login', '/blog', '/bundles']) {
      expect((await guest(path)).status, path).toBe(200)
    }
  })
})

describe('cart and checkout', () => {
  it('prices the cart for a guest, but checkout needs login', async () => {
    const q = await guest('/api/cart/quote', { method: 'POST', body: { ids: [deck.id, cheap.id] } })
    expect(q.data.total).toBe(140000)
    expect((await guest('/api/checkout', { method: 'POST', body: { ids: [deck.id] } })).status).toBe(401)
  })

  it('gets a free product straight into the library', async () => {
    const r = await buyer('/api/checkout', { method: 'POST', body: { ids: [free.id] } })
    expect(r.data.next).toBe('/library')
    const lib = (await buyer('/api/library')).data
    expect(lib.some((i: any) => i.productId === free.id)).toBe(true)
  })

  it('pays with ZarinPal, then downloads the file from the library', async () => {
    const r = await payWithZarinpal(buyer, { ids: [deck.id] })
    const order = (await buyer(`/api/orders/${r.data.number}`)).data
    expect(order.status).toBe('PAID')

    const item = (await buyer('/api/library')).data.find((i: any) => i.productId === deck.id)
    expect(item.files).toHaveLength(1)
    const link = await buyer(`/api/library/${deck.id}/link`, { method: 'POST', body: { fileId: item.files[0].id } })
    expect(link.data.url).toMatch(/^\/dl\//)
    const file = await buyer(link.data.url)
    expect(file.status).toBe(200)
    expect(file.bytes.length).toBe(apkg.length)

    // Someone else cannot get a link for it
    const stranger = client()
    await loginWithCode(stranger, newPhone())
    expect((await stranger(`/api/library/${deck.id}/link`, { method: 'POST', body: { fileId: item.files[0].id } })).status).toBe(403)
  })

  it('skips products the buyer already owns', async () => {
    const r = await buyer('/api/checkout', { method: 'POST', body: { ids: [deck.id], method: 'zarinpal' } })
    expect(r.status).toBe(409)
  })

  it('pays by card-to-card: receipt upload, admin rejects, buyer re-uploads, admin approves', async () => {
    await withSettings(admin, s => ({ ...s, payments: { ...s.payments, card: { enabled: true, cardNumber: '6037991234567890', holder: 'Store', bank: 'Melli' } } }), async () => {
      const methods = (await buyer('/api/checkout/methods')).data
      expect(JSON.stringify(methods)).toContain('card')

      const r = await buyer('/api/checkout', { method: 'POST', body: { ids: [cheap.id], method: 'card' } })
      expect(r.data.next).toBe(`/orders/${r.data.number}`)
      const upload = (image: Uint8Array) => {
        const form = new FormData()
        form.append('method', 'card')
        form.append('payerCard4', '۱۲۳۴')
        form.append('reference', 'TRX-123456')
        form.append('transferredAt', new Date().toISOString())
        form.append('receipt', new Blob([image]), 'receipt.png')
        return buyer(`/api/orders/${r.data.number}/receipt`, { method: 'POST', form })
      }
      // A file that only claims to be an image is refused
      expect((await upload(new TextEncoder().encode('<svg onload=alert(1)>'))).status).toBe(422)
      expect((await upload(PNG)).status).toBe(200)
      expect((await buyer(`/api/orders/${r.data.number}`)).data.status).toBe('AWAITING_VERIFICATION')

      const order = await db.order.findFirstOrThrow({ where: { number: Number(r.data.number) }, include: { payments: { orderBy: { createdAt: 'desc' } } } })
      expect((await buyer(`/api/admin/payments/${order.payments[0]!.id}/approve`, { method: 'POST' })).status).toBe(403)
      expect((await admin(`/api/admin/payments/${order.payments[0]!.id}/reject`, { method: 'POST', body: { reason: 'Wrong amount' } })).status).toBe(200)
      expect((await buyer(`/api/orders/${r.data.number}`)).data.status).toBe('REJECTED')

      expect((await upload(PNG)).status).toBe(200)
      const again = await db.payment.findFirstOrThrow({ where: { orderId: order.id, status: 'SUBMITTED' } })
      expect((await admin(`/api/admin/payments/${again.id}/receipt`)).status).toBe(200)
      expect((await admin(`/api/admin/payments/${again.id}/approve`, { method: 'POST' })).status).toBe(200)
      expect((await admin(`/api/admin/payments/${again.id}/approve`, { method: 'POST' })).status).toBe(409)
      expect((await buyer(`/api/orders/${r.data.number}`)).data.status).toBe('PAID')
      expect((await buyer('/api/library')).data.some((i: any) => i.productId === cheap.id)).toBe(true)
    })
  })

  it('lists the buyer\'s orders and download history', async () => {
    const orders = (await buyer('/api/orders')).data
    expect(JSON.stringify(orders)).toContain(deck.slug)
    const downloads = (await buyer('/api/library/downloads')).data
    expect(downloads[0].product.slug).toBe(deck.slug)
  })
})

describe('coupons and bundles', () => {
  it('applies a coupon and a bundle together and counts the coupon use', async () => {
    const shopper = client()
    await loginWithCode(shopper, newPhone())
    const a = await createProduct(admin, 'bundle-a', 100000)
    const b = await createProduct(admin, 'bundle-b', 50000)
    const c = await createProduct(admin, 'bundle-c', 30000)

    expect((await admin('/api/admin/coupons', { method: 'POST', body: { code: 'x', kind: 'PERCENT', value: 10 } })).status).toBe(400)
    expect((await admin('/api/admin/coupons', { method: 'POST', body: { code: `P${stamp}`, kind: 'PERCENT', value: 150 } })).status).toBe(400)
    const coupon = (await admin('/api/admin/coupons', { method: 'POST', body: { code: `off۲۰${stamp}`, kind: 'PERCENT', value: 20, maxUses: 5, note: '<b>note</b>' } })).data
    expect(coupon.code).toBe(`OFF20${stamp}`)
    expect(coupon.note).toBe('note')

    expect((await admin('/api/admin/bundles', { method: 'POST', body: { slug: `e2e-b-${stamp}`, title: { fa: 'بسته', en: 'Bundle' }, price: 120000, productIds: [a.id] } })).status).toBe(400)
    expect((await admin('/api/admin/bundles', { method: 'POST', body: { slug: `e2e-b-${stamp}`, title: { fa: 'بسته', en: 'Bundle' }, price: 150000, productIds: [a.id, b.id] } })).status).toBe(422)
    const bundle = (await admin('/api/admin/bundles', { method: 'POST', body: { slug: `e2e-b-${stamp}`, title: { fa: 'بسته', en: 'Bundle' }, price: 120000, productIds: [a.id, b.id] } })).data
    expect((await guest(`/api/bundles/e2e-b-${stamp}`)).data.saving).toBe(30000)

    const bad = await shopper('/api/cart/quote', { method: 'POST', body: { ids: [c.id], coupon: 'NOPE' } })
    expect(bad.data.couponError).toBe('invalid')
    expect((await shopper('/api/checkout', { method: 'POST', body: { ids: [c.id], coupon: 'NOPE', method: 'zarinpal' } })).status).toBe(422)

    const q = await shopper('/api/cart/quote', { method: 'POST', body: { ids: [`b:${bundle.id}`, c.id], coupon: coupon.code.toLowerCase() } })
    expect(q.data.total).toBe(120000 + 24000)
    const r = await payWithZarinpal(shopper, { ids: [`b:${bundle.id}`, c.id], coupon: coupon.code })
    const order = (await shopper(`/api/orders/${r.data.number}`)).data
    expect(order).toMatchObject({ status: 'PAID', total: 144000, couponCode: coupon.code })
    expect((await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usedCount).toBe(1)
    expect((await admin(`/api/admin/coupons/${coupon.id}`, { method: 'DELETE' })).status).toBeGreaterThanOrEqual(400)
  })
})
