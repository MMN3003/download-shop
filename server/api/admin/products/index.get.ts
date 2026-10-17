import type { Prisma } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const access = await catalogAccess(event)
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page) || 1)
  const perPage = Math.min(100, Number(q.perPage) || 20)
  const where: Prisma.ProductWhereInput = {
    // Sellers only ever see their own products
    ...(access.staff ? (q.seller ? { sellerId: q.seller } : {}) : { sellerId: access.seller!.id }),
    ...(q.ids ? { id: { in: String(q.ids).split(',').slice(0, 100) } } : {}),
    ...(q.status ? { status: q.status as any } : {}),
    ...(q.type ? { productTypeId: q.type } : {}),
    ...(q.q ? { OR: [{ searchText: { contains: normalizeSearch(q.q), mode: 'insensitive' } }, { slug: { contains: q.q } }] } : {}),
  }
  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * perPage, take: perPage, include: { productType: true, seller: true, _count: { select: { files: true } } } }),
    prisma.product.count({ where }),
  ])
  return {
    items: items.map(p => ({ id: p.id, slug: p.slug, title: p.title, status: p.status, price: p.price, finalPrice: effectivePrice(p), isFree: p.isFree, featured: p.featured, cover: publicUrl(p.cover), type: p.productType.name, seller: p.seller?.displayName, files: p._count.files, salesCount: p.salesCount, updatedAt: p.updatedAt })),
    total, page, perPage,
  }
})
