export default defineEventHandler(async (event) => {
  await requireEditor(event)
  const items = await prisma.bundle.findMany({ include: bundleInclude, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] })
  const sold = await prisma.orderItem.groupBy({ by: ['bundleId'], where: { bundleId: { in: items.map(b => b.id) }, order: { status: 'PAID' } }, _count: { orderId: true } })
  return items.map(b => ({ ...toPublicBundle(b), active: b.active, sortOrder: b.sortOrder, coverKey: b.cover, productIds: b.items.map(i => i.productId), soldLines: sold.find(s => s.bundleId === b.id)?._count.orderId ?? 0 }))
})
