export default defineEventHandler(async (event) => {
  await requireRole(event, ADMIN_ROLES)
  const since = new Date(Date.now() - 30 * 86400_000)
  const [products, published, inReview, sections, types, users, recent, pendingReceipts, paid30] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: 'PUBLISHED' } }),
    prisma.product.count({ where: { status: 'IN_REVIEW' } }),
    prisma.section.count(),
    prisma.productType.count(),
    prisma.user.count(),
    prisma.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { name: true, email: true } } } }),
    prisma.order.count({ where: { status: 'AWAITING_VERIFICATION' } }),
    prisma.order.aggregate({ where: { status: 'PAID', paidAt: { gte: since } }, _sum: { total: true }, _count: true }),
  ])
  return { products, published, inReview, sections, types, users, recent, pendingReceipts, sales30: { count: paid30._count, total: paid30._sum.total ?? 0 } }
})
