export default defineEventHandler(async (event) => {
  await requireRole(event, ADMIN_ROLES)
  const since = new Date(Date.now() - 30 * 86400_000)
  const [products, published, inReview, sections, types, users, recent, pendingReceipts, paid30, newRequests, pendingSellers, proposals, payouts, reports] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: 'PUBLISHED' } }),
    prisma.product.count({ where: { status: 'IN_REVIEW' } }),
    prisma.section.count(),
    prisma.productType.count(),
    prisma.user.count(),
    prisma.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { name: true, email: true } } } }),
    prisma.order.count({ where: { status: 'AWAITING_VERIFICATION' } }),
    prisma.order.aggregate({ where: { status: 'PAID', paidAt: { gte: since } }, _sum: { total: true }, _count: true }),
    prisma.productRequest.count({ where: { unreadStaff: true, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.seller.count({ where: { status: 'pending' } }),
    prisma.commissionAgreement.count({ where: { status: 'PROPOSED', proposedBy: 'seller' } }),
    prisma.payout.count({ where: { status: 'REQUESTED' } }),
    prisma.contentReport.count({ where: { status: 'open' } }),
  ])
  return { products, published, inReview, sections, types, users, recent, pendingReceipts, newRequests, pendingSellers, proposals, payouts, reports, sales30: { count: paid30._count, total: paid30._sum.total ?? 0 } }
})
