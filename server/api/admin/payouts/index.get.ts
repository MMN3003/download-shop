export default defineEventHandler(async (event) => {
  await requireOwner(event)
  const q = getQuery(event) as Record<string, string>
  const items = await prisma.payout.findMany({
    where: q.status ? { status: q.status as any } : {},
    include: { seller: { select: { id: true, displayName: true, accountHolder: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return items
})
