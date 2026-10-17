export default defineEventHandler(async (event) => {
  await requireOwner(event)
  const q = getQuery(event) as Record<string, string>
  const sellers = await prisma.seller.findMany({
    where: {
      ...(q.status ? { status: q.status } : {}),
      ...(q.q ? { OR: [{ displayName: { contains: q.q, mode: 'insensitive' } }, { slug: { contains: q.q } }, { user: { email: { contains: q.q } } }, { user: { phone: { contains: q.q } } }] } : {}),
    },
    include: { user: { select: { email: true, phone: true, name: true } }, _count: { select: { products: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  const [proposals, payouts] = await Promise.all([
    prisma.commissionAgreement.groupBy({ by: ['sellerId'], where: { status: 'PROPOSED', proposedBy: 'seller' }, _count: true }),
    prisma.payout.groupBy({ by: ['sellerId'], where: { status: 'REQUESTED' }, _count: true }),
  ])
  const count = (rows: { sellerId: string, _count: number }[], id: string) => rows.find(r => r.sellerId === id)?._count ?? 0
  return Promise.all(sellers.map(async s => ({
    id: s.id, slug: s.slug, displayName: s.displayName, status: s.status, trusted: s.trusted, createdAt: s.createdAt,
    contact: s.user.email || s.user.phone, products: s._count.products,
    rate: await currentRate(s.id), proposals: count(proposals, s.id), payouts: count(payouts, s.id),
  })))
})
