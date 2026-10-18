import { beforeAll, describe, expect, it } from 'vitest'
import { client, createProduct, hasMarkup, hasScript, loginAdmin, loginWithCode, newPhone, payWithZarinpal, stamp, withSettings, XSS } from './helpers'

const admin = client(), buyer = client(), other = client(), guest = client()
let p1: Awaited<ReturnType<typeof createProduct>>, p2: typeof p1

beforeAll(async () => {
  await loginAdmin(admin)
  await loginWithCode(buyer, newPhone())
  await loginWithCode(other, newPhone())
  p1 = await createProduct(admin, 'review-a', 20000)
  p2 = await createProduct(admin, 'review-b', 20000)
  await payWithZarinpal(buyer, { ids: [p1.id, p2.id] })
})

describe('reviews', () => {
  it('only buyers review; text is plain; staff reply and hide', async () => {
    expect((await other(`/api/products/${p1.slug}/reviews`, { method: 'POST', body: { rating: 5, body: 'nice' } })).status).toBe(403)
    const r = await buyer(`/api/products/${p1.slug}/reviews`, { method: 'POST', body: { rating: 4, body: `${XSS}Great <b>deck</b>` } })
    expect(r.data.status).toBe('published')
    expect(hasMarkup(r.data.body)).toBe(false)
    expect((await guest(`/api/products/${p1.slug}`)).data.product).toMatchObject({ ratingAvg: 4, ratingCount: 1 })

    expect((await admin(`/api/admin/reviews/${r.data.id}`, { method: 'PUT', body: { reply: `${XSS}Thanks!` } })).status).toBe(200)
    const shown = (await guest(`/api/products/${p1.slug}/reviews`)).data.items[0]
    expect(shown.sellerReply).toContain('Thanks!')
    expect(hasMarkup(shown.sellerReply)).toBe(false)

    await admin(`/api/admin/reviews/${r.data.id}`, { method: 'PUT', body: { status: 'hidden' } })
    expect((await guest(`/api/products/${p1.slug}`)).data.product.ratingCount).toBe(0)
    expect((await buyer(`/api/products/${p1.slug}/reviews`, { method: 'POST', body: { rating: 5 } })).data.status).toBe('hidden')
    expect((await buyer('/api/admin/reviews')).status).toBe(403)
  })

  it('holds new reviews when moderation is on', async () => {
    await withSettings(admin, s => ({ ...s, reviews: { ...s.reviews, enabled: true, moderate: true } }), async () => {
      expect((await buyer(`/api/products/${p2.slug}/reviews`, { method: 'POST', body: { rating: 3 } })).data.status).toBe('pending')
      expect((await admin('/api/admin/stats')).data.pendingReviews).toBeGreaterThanOrEqual(1)
    })
  })

  it('the product page shows reviews escaped', async () => {
    const html = (await guest(`/p/${p1.slug}`)).data as string
    expect(html).not.toMatch(/<img src=x onerror|<script>alert/)
  })
})

describe('wishlist', () => {
  it('saves and removes products for logged-in users', async () => {
    expect((await guest(`/api/wishlist/${p2.id}`, { method: 'PUT' })).status).toBe(401)
    await other(`/api/wishlist/${p2.id}`, { method: 'PUT' })
    await other(`/api/wishlist/${p2.id}`, { method: 'PUT' })
    expect((await other('/api/wishlist/ids')).data.filter((x: string) => x === p2.id)).toHaveLength(1)
    expect((await other('/api/wishlist')).data.some((p: any) => p.id === p2.id)).toBe(true)
    expect((await other(`/api/products/${p2.slug}`)).data.wished).toBe(true)
    await other(`/api/wishlist/${p2.id}`, { method: 'DELETE' })
    expect((await other('/api/wishlist/ids')).data).not.toContain(p2.id)
  })
})

describe('product requests', () => {
  it('a buyer asks for a product and chats with support', async () => {
    const { options } = (await buyer('/api/requests/options')).data
    const [from, to] = [options[0].value, options[1]?.value ?? options[0].value]
    expect((await guest('/api/requests', { method: 'POST', body: { source: from, target: to, subject: 'Need it' } })).status).toBe(401)
    expect((await buyer('/api/requests', { method: 'POST', body: { source: 'nope', target: to, subject: 'Need it' } })).status).toBe(422)
    const r = await buyer('/api/requests', { method: 'POST', body: { source: from, target: to, subject: `${XSS}Medical deck ${stamp}`, details: `${XSS}details` } })
    expect(r.status).toBe(200)
    expect((await buyer(`/api/requests/${r.data.number}/messages`, { method: 'POST', body: { body: `${XSS}any news?` } })).status).toBe(200)

    const mine = (await buyer(`/api/requests/${r.data.number}`)).data
    expect(hasMarkup(mine)).toBe(false)
    expect((await other(`/api/requests/${r.data.number}`)).status).toBe(404)

    const staffList = (await admin(`/api/admin/requests?q=${stamp}`)).data.items
    const row = staffList.find((x: any) => x.number === r.data.number) ?? (await admin('/api/admin/requests')).data.items.find((x: any) => x.number === r.data.number)
    expect((await admin(`/api/admin/requests/${row.id}`, { method: 'PUT', body: { status: 'DONE', productSlug: p1.slug, message: `${XSS}Here it is` } })).status).toBe(200)
    const done = (await buyer(`/api/requests/${r.data.number}`)).data
    expect(done.status).toBe('DONE')
    expect(hasMarkup(done)).toBe(false)
    expect(JSON.stringify(done)).toContain('Here it is')
  })
})

describe('blog and home page', () => {
  it('cleans post HTML, hides drafts and shows published posts', async () => {
    const r = await admin('/api/admin/blog', {
      method: 'POST',
      body: {
        slug: `e2e-post-${stamp}`, title: { fa: `${XSS}عنوان`, en: 'Title' }, excerpt: { en: '<b>Short</b>' }, status: 'draft', tags: ['<i>e2e</i>'], productIds: [p1.id],
        body: { en: '<h2>Hi</h2><script>alert(1)</script><p onclick="x()">t</p><a href="javascript:alert(1)">l</a><iframe src="https://evil.example"></iframe>' },
      },
    })
    const post = r.data
    expect(hasScript(post.body)).toBe(false)
    expect(hasMarkup(post.title.fa + post.excerpt.en + post.tags.join())).toBe(false)
    expect((await guest(`/api/blog/${post.slug}`)).status).toBe(404)

    const { id, createdAt, updatedAt, publishedAt, cover, coverUrl, ...fields } = post
    expect((await admin(`/api/admin/blog/${id}`, { method: 'PUT', body: { ...fields, status: 'published', cover: 'javascript:alert(1)' } })).status).toBe(400)
    expect((await admin(`/api/admin/blog/${id}`, { method: 'PUT', body: { ...fields, status: 'published' } })).status).toBe(200)
    expect((await guest(`/api/blog/${post.slug}`)).data.products[0].id).toBe(p1.id)
    expect((await guest('/api/blog?tag=e2e')).data.items.some((x: any) => x.slug === post.slug)).toBe(true)
    const html = (await guest(`/blog/${post.slug}`)).data as string
    expect(html).not.toMatch(/<script>alert|onclick=|javascript:alert/)
  })

  it('home builder refuses unsafe banners and saves blocks in order', async () => {
    const before = (await admin('/api/admin/home')).data
    const banner = (b: object) => admin('/api/admin/home', { method: 'PUT', body: { blocks: [{ id: 'bn', type: 'banner', enabled: true, image: 'images/x.png', link: '/s/x', ...b }] } })
    expect((await banner({ link: 'javascript:alert(1)' })).status).toBe(400)
    expect((await banner({ link: '//evil.example' })).status).toBe(400)
    expect((await banner({ image: '../secret' })).status).toBe(400)
    try {
      const r = await admin('/api/admin/home', { method: 'PUT', body: { blocks: [{ id: 'newest', type: 'newest', enabled: true, limit: 2, title: { en: '<b>New</b>', fa: 'تازه‌ها' } }, { id: 'how', type: 'how', enabled: true }] } })
      expect(r.data[0].title.en).toBe('New')
      expect((await guest('/api/home')).data.blocks.map((b: any) => b.type)).toEqual(['newest', 'how'])
    }
    finally {
      await admin('/api/admin/home', { method: 'PUT', body: { blocks: before.map(({ imageUrl, ...b }: any) => b) } })
    }
  })
})

describe('admin', () => {
  it('creates, renames and deletes a section', async () => {
    const r = await admin('/api/admin/sections', { method: 'POST', body: { slug: `e2e-sec-${stamp}`, name: { fa: `${XSS}دسته`, en: 'Section' } } })
    expect(r.status).toBe(200)
    expect(hasMarkup(r.data.name)).toBe(false)
    expect((await guest(`/api/sections/e2e-sec-${stamp}`)).status).toBe(200)
    expect((await admin(`/api/admin/sections/${r.data.id}`, { method: 'PUT', body: { ...r.data, name: { fa: 'دسته ۲', en: 'Section 2' } } })).status).toBe(200)
    expect((await admin(`/api/admin/sections/${r.data.id}`, { method: 'DELETE' })).status).toBe(200)
    expect((await guest(`/api/sections/e2e-sec-${stamp}`)).status).toBe(404)
  })

  it('edits and deletes an unsold product', async () => {
    const p = await createProduct(admin, 'edit', 1000)
    const full = (await admin(`/api/admin/products/${p.id}`)).data
    const r = await admin(`/api/admin/products/${p.id}`, { method: 'PUT', body: { ...full, title: { fa: 'تازه', en: 'New' }, price: 2000 } })
    expect(r.data.price).toBe(2000)
    expect((await admin(`/api/admin/products/${p.id}`, { method: 'DELETE' })).status).toBe(200)
    expect((await guest(`/api/products/${p.slug}`)).status).toBe(404)
  })

  it('shows orders and the sales report, with a safe CSV', async () => {
    expect((await admin('/api/admin/orders')).data.items.length).toBeGreaterThan(0)
    const sales = await admin('/api/admin/sales')
    expect(sales.data.totals.orders).toBeGreaterThan(0)
    expect((await admin('/api/admin/sales?from=2020-01-01&to=2026-12-31')).status).toBe(422)
    const csv = await admin('/api/admin/sales.csv')
    expect(csv.headers.get('content-type')).toContain('text/csv')
    expect([...csv.bytes.slice(0, 3)]).toEqual([0xEF, 0xBB, 0xBF])
  })
})
