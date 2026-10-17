export default defineEventHandler(async (event) => {
  await requireEditor(event)
  const items = await prisma.coupon.findMany({ include: { section: { select: { name: true } }, product: { select: { title: true } } }, orderBy: { createdAt: 'desc' } })
  // Money given away with each code, from paid orders
  const saved = await prisma.order.groupBy({ by: ['couponId'], where: { status: 'PAID', couponId: { in: items.map(c => c.id) } }, _sum: { discount: true } })
  return items.map(c => ({ ...c, discountGiven: saved.find(s => s.couponId === c.id)?._sum.discount ?? 0 }))
})
