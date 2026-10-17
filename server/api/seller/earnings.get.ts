/** Sales of the seller's products: recent lines and totals. */
export default defineEventHandler(async (event) => {
  const { seller } = await approvedSeller(event)
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page) || 1)
  const perPage = 30
  const where = { sellerId: seller.id, order: { status: { in: ['PAID', 'REFUNDED'] as any } } }
  const [items, total, sums] = await Promise.all([
    prisma.orderItem.findMany({ where, include: { order: { select: { number: true, status: true, paidAt: true } } }, orderBy: { order: { paidAt: 'desc' } }, skip: (page - 1) * perPage, take: perPage }),
    prisma.orderItem.count({ where }),
    prisma.orderItem.aggregate({ where: { sellerId: seller.id, order: { status: 'PAID' } }, _sum: { unitPrice: true, commission: true, sellerNet: true }, _count: true }),
  ])
  return {
    items: items.map(i => ({ id: i.id, title: i.title, price: i.unitPrice, commission: i.commission, percent: i.commissionPercent, sellerNet: i.sellerNet, orderNumber: i.order.number, status: i.order.status, paidAt: i.order.paidAt })),
    total, page, perPage,
    totals: { sales: sums._count, gross: sums._sum.unitPrice ?? 0, commission: sums._sum.commission ?? 0, net: sums._sum.sellerNet ?? 0 },
    balance: await sellerBalance(seller.id),
  }
})
