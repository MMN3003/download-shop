export default defineEventHandler(async (event) => {
  await requireRole(event, ADMIN_ROLES)
  const q = getQuery(event) as Record<string, string>
  return prisma.contentReport.findMany({
    where: { status: q.status || 'open' },
    include: { product: { select: { id: true, slug: true, title: true, status: true, seller: { select: { id: true, displayName: true } } } }, user: { select: { email: true, phone: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
})
