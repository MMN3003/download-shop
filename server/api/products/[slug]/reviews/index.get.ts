/** Published reviews of a product, the rating spread, and the viewer's own review and right to write one. */
export default defineEventHandler(async (event) => {
  const p = await prisma.product.findFirst({ where: { slug: getRouterParam(event, 'slug')!, status: 'PUBLISHED' }, select: { id: true, ratingAvg: true, ratingCount: true } })
  if (!p) throw createError({ statusCode: 404, message: 'Not found' })
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page) || 1)
  const perPage = 10
  const userId = ((await getUserSession(event)).user as { id: string } | undefined)?.id
  const [items, spread, mine, owns, { reviews }] = await Promise.all([
    prisma.review.findMany({ where: { productId: p.id, status: 'published' }, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * perPage, take: perPage }),
    prisma.review.groupBy({ by: ['rating'], where: { productId: p.id, status: 'published' }, _count: true }),
    userId ? prisma.review.findUnique({ where: { productId_userId: { productId: p.id, userId } }, include: { user: { select: { name: true } } } }) : null,
    userId ? prisma.libraryItem.count({ where: { userId, productId: p.id, revoked: false } }) : 0,
    getSettings(),
  ])
  return {
    avg: p.ratingAvg, count: p.ratingCount, page, perPage,
    spread: [5, 4, 3, 2, 1].map(r => ({ rating: r, count: spread.find(s => s.rating === r)?._count ?? 0 })),
    items: items.map(toPublicReview),
    mine: mine && toPublicReview(mine),
    canReview: reviews.enabled && !!owns,
  }
})
