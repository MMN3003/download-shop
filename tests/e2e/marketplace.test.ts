import { beforeAll, describe, expect, it } from 'vitest'
import { client, createProduct, db, hasMarkup, hasScript, loginAdmin, loginWithCode, newEmail, newPhone, payWithZarinpal, stamp, withSettings, XSS } from './helpers'

const admin = client(), seller = client(), buyer = client(), guest = client()
const shop = `e2e-shop-${stamp}`
let sellerId = '', productId = '', productSlug = ''

beforeAll(async () => {
  await loginAdmin(admin)
  await loginWithCode(seller, newEmail('seller'))
  await loginWithCode(buyer, newPhone())
})

describe('becoming a seller', () => {
  it('applies with plain-text shop details, once', async () => {
    expect((await seller('/api/seller/me')).data.seller).toBeNull()
    const body = { displayName: `${XSS}Shop <b>One</b>`, slug: shop, bio: `${XSS}Hi`, terms: true, percent: 15, note: 'big catalog' }
    expect((await seller('/api/seller/apply', { method: 'POST', body: { ...body, terms: false } })).status).toBe(400)
    const r = await seller('/api/seller/apply', { method: 'POST', body })
    expect(r.data.status).toBe('pending')
    const me = (await seller('/api/seller/me')).data.seller
    expect(hasMarkup(me.displayName + me.bio)).toBe(false)
    expect((await seller('/api/seller/apply', { method: 'POST', body: { ...body, slug: `${shop}-2` } })).status).toBe(409)
    expect((await seller('/api/admin/products')).status).toBe(403)
  })

  it('owner approves; the seller gets their panel but not store-wide data', async () => {
    const s = (await admin('/api/admin/sellers?status=pending')).data.find((x: any) => x.slug === shop)
    sellerId = s.id
    expect((await admin(`/api/admin/sellers/${sellerId}`, { method: 'PUT', body: { status: 'approved' } })).status).toBe(200)
    expect((await seller('/api/seller/me')).data.seller.status).toBe('approved')
    expect((await seller('/api/admin/products')).status).toBe(200)
    for (const path of ['/api/admin/stats', '/api/admin/orders', '/api/admin/settings', '/api/admin/sales']) {
      expect((await seller(path)).status, path).toBe(403)
    }
  })

  it('negotiates commission: owner counter-offers, seller accepts', async () => {
    const proposal = (await admin(`/api/admin/sellers/${sellerId}`)).data.agreements.find((a: any) => a.proposedBy === 'seller')
    expect((await admin(`/api/admin/sellers/${sellerId}/agreements`, { method: 'POST', body: { percent: 20, replyTo: proposal.id, note: 'meet halfway' } })).data.status).toBe('PROPOSED')
    const list = (await seller('/api/seller/agreements')).data
    const offer = list.items.find((a: any) => a.proposedBy === 'store' && a.status === 'PROPOSED')
    expect(list.rate.isDefault).toBe(true)
    expect((await seller(`/api/seller/agreements/${offer.id}`, { method: 'PUT', body: { action: 'withdraw' } })).status).toBe(422)
    expect((await seller(`/api/seller/agreements/${offer.id}`, { method: 'PUT', body: { action: 'accept' } })).status).toBe(200)
    expect((await seller('/api/seller/agreements')).data.rate.percent).toBe(20)
  })
})

describe('seller products', () => {
  it('a seller\'s product goes through review and its description is cleaned', async () => {
    const p = await createProduct(seller, 'seller', 100000, {
      featured: true, sellerId: 'someone-else',
      description: { fa: '<p>hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src=x onerror=alert(1)>' },
    })
    productId = p.id
    productSlug = p.slug
    expect(p).toMatchObject({ status: 'IN_REVIEW', featured: false, sellerId })
    expect(hasScript(p.description)).toBe(false)
    expect((await guest(`/api/products/${productSlug}`)).status).toBe(404)

    const list = (await seller('/api/admin/products')).data.items
    expect(list.map((x: any) => x.id)).toEqual([productId])
    const other = (await admin('/api/admin/products')).data.items.find((x: any) => x.id !== productId)
    expect((await seller(`/api/admin/products/${other.id}`)).status).toBe(404)
    expect((await seller(`/api/admin/products/${other.id}`, { method: 'DELETE' })).status).toBe(404)

    expect((await seller(`/api/admin/products/${productId}/review`, { method: 'PUT', body: { action: 'approve' } })).status).toBe(403)
    expect((await admin(`/api/admin/products/${productId}/review`, { method: 'PUT', body: { action: 'reject' } })).status).toBe(422)
    expect((await admin(`/api/admin/products/${productId}/review`, { method: 'PUT', body: { action: 'reject', note: 'Add a <b>cover</b>' } })).data.status).toBe('DRAFT')
    expect((await seller(`/api/admin/products/${productId}`)).data.reviewNote).toBe('Add a cover')
    expect((await admin(`/api/admin/products/${productId}/review`, { method: 'PUT', body: { action: 'approve' } })).data.status).toBe('PUBLISHED')
    expect((await guest(`/api/products/${productSlug}`)).status).toBe(200)
  })

  it('a sale records the agreed 20% commission, held until the holding period ends', async () => {
    await payWithZarinpal(buyer, { ids: [productId] })
    const earnings = (await seller('/api/seller/earnings')).data
    expect(earnings.items[0]).toMatchObject({ percent: 20, commission: 20000, sellerNet: 80000 })
    expect(earnings.balance).toMatchObject({ held: 80000, available: 0 })
    expect((await seller(`/api/admin/products/${productId}`, { method: 'DELETE' })).status).toBe(409)
  })

  it('pays out to a Sheba account, once, after the hold', async () => {
    expect((await seller('/api/seller/payouts', { method: 'POST', body: { amount: 80000 } })).status).toBe(422)
    expect((await seller('/api/seller/profile', { method: 'PUT', body: { displayName: 'Shop One', sheba: 'IR12 0000' } })).status).toBe(400)
    expect((await seller('/api/seller/profile', { method: 'PUT', body: { displayName: 'Shop One', avatar: '../../etc/passwd' } })).status).toBe(422)
    expect((await seller('/api/seller/profile', { method: 'PUT', body: { displayName: 'Shop One', sheba: 'ir 120000000000000000000000', accountHolder: 'Owner' } })).data.sheba).toBe('IR120000000000000000000000')
    expect((await seller('/api/seller/payouts', { method: 'POST', body: { amount: 80000 } })).status).toBe(422)

    // Move the sale back past the holding period
    await db.order.updateMany({ where: { items: { some: { sellerId } } }, data: { paidAt: new Date(Date.now() - 30 * 86400_000) } })
    await withSettings(admin, s => ({ ...s, marketplace: { ...s.marketplace, minPayout: 60000 } }), async () => {
      expect((await seller('/api/seller/payouts')).data.balance.available).toBe(80000)
      expect((await seller('/api/seller/payouts', { method: 'POST', body: { amount: 50000 } })).status).toBe(422)
      const tries = await Promise.all([1, 2, 3].map(() => seller('/api/seller/payouts', { method: 'POST', body: { amount: 80000 } })))
      expect(tries.filter(t => t.status === 200)).toHaveLength(1)
    })
    const payout = (await seller('/api/seller/payouts')).data.items[0]
    expect((await admin(`/api/admin/payouts/${payout.id}`, { method: 'PUT', body: { action: 'paid' } })).status).toBe(400)
    expect((await admin(`/api/admin/payouts/${payout.id}`, { method: 'PUT', body: { action: 'paid', reference: '<i>TRX-991</i>' } })).status).toBe(200)
    expect((await admin(`/api/admin/payouts/${payout.id}`, { method: 'PUT', body: { action: 'reject' } })).status).toBe(409)
    expect((await seller('/api/seller/payouts')).data.items[0]).toMatchObject({ status: 'PAID', reference: 'TRX-991' })
  })

  it('the public shop page shows products but no bank details', async () => {
    const r = await guest(`/api/sellers/${shop}`)
    expect(r.data.products).toHaveLength(1)
    expect(JSON.stringify(r.data)).not.toContain('IR1200')
    expect(JSON.stringify((await guest(`/api/products/${productSlug}`)).data)).not.toContain('IR1200')
  })
})

describe('reports and suspension', () => {
  it('a guest reports a product; staff hide it; the buyer keeps it', async () => {
    const body = { reason: 'copyright', details: `${XSS}This is my deck` }
    expect((await guest(`/api/products/${productSlug}/report`, { method: 'POST', body })).status).toBe(422)
    expect((await guest(`/api/products/${productSlug}/report`, { method: 'POST', body: { ...body, contact: 'me@example.com' } })).status).toBe(200)
    const report = (await admin('/api/admin/reports')).data.find((x: any) => x.product.id === productId)
    expect(hasMarkup(report.details)).toBe(false)
    await admin(`/api/admin/reports/${report.id}`, { method: 'PUT', body: { status: 'resolved', hideProduct: true } })
    expect((await guest(`/api/products/${productSlug}`)).status).toBe(404)
    expect(JSON.stringify((await buyer('/api/library')).data)).toContain(productId)
  })

  it('a suspended seller loses the panel and the shop page', async () => {
    await admin(`/api/admin/sellers/${sellerId}`, { method: 'PUT', body: { status: 'suspended', reviewNote: 'test' } })
    expect((await seller('/api/admin/products')).status).toBe(403)
    expect((await guest(`/api/sellers/${shop}`)).status).toBe(404)
  })
})
