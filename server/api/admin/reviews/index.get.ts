import type { Prisma } from '@prisma/client'

/** Reviews to moderate (staff) or to answer (a seller, on their own products). */
export default defineEventHandler(async (event) => {
  const { staff, seller } = await reviewAccess(event)
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page) || 1)
  const perPage = 30
  const where: Prisma.ReviewWhereInput = {
    ...(staff ? {} : { product: { sellerId: seller!.id } }),
    ...(q.status ? { status: q.status } : {}),
    ...(q.unanswered === '1' ? { sellerReply: null } : {}),
    ...(q.rating ? { rating: Number(q.rating) } : {}),
  }
  const [items, total] = await Promise.all([
    prisma.review.findMany({ where, include: { user: { select: { name: true, email: true, phone: true } }, product: { select: { id: true, slug: true, title: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * perPage, take: perPage }),
    prisma.review.count({ where }),
  ])
  return {
    items: items.map(r => ({ ...toPublicReview(r), product: r.product, ...(staff ? { contact: r.user.email || r.user.phone } : {}) })),
    total, page, perPage, staff,
  }
})
