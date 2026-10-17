import { Prisma } from '@prisma/client'

/** Parse from/to (YYYY-MM-DD, `to` inclusive) into a [from, to) range; default the last 30 days. */
export function salesRange(q: Record<string, string>) {
  const day = (s: string | undefined) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : null)
  const to = day(q.to) ? new Date(day(q.to)!.getTime() + 86400_000) : new Date(Date.now() + 1)
  const from = day(q.from) ?? new Date(to.getTime() - 30 * 86400_000)
  if (to.getTime() - from.getTime() > 3 * 366 * 86400_000) throw createError({ statusCode: 422, message: 'Choose at most three years' })
  const group = q.group === 'month' || (q.group !== 'day' && to.getTime() - from.getTime() > 92 * 86400_000) ? 'month' : 'day'
  return { from, to, group: group as 'day' | 'month' }
}

export async function salesReport({ from, to, group }: ReturnType<typeof salesRange>) {
  const paid = { status: 'PAID' as const, paidAt: { gte: from, lt: to } }
  const trunc = Prisma.raw(group === 'month' ? `'month'` : `'day'`)
  const [totals, refunds, series, topProducts, topSellers, coupons, settlement] = await Promise.all([
    prisma.orderItem.aggregate({ where: { order: paid }, _sum: { unitPrice: true, discount: true, commission: true, sellerNet: true }, _count: true }),
    prisma.order.aggregate({ where: { status: 'REFUNDED', paidAt: { gte: from, lt: to } }, _sum: { total: true }, _count: true }),
    prisma.$queryRaw<{ bucket: Date, orders: bigint, gross: bigint, commission: bigint }[]>`
      SELECT date_trunc(${trunc}, o."paidAt") AS bucket, count(DISTINCT o.id) AS orders,
             coalesce(sum(i."unitPrice"), 0) AS gross, coalesce(sum(i.commission), 0) AS commission
      FROM "Order" o JOIN "OrderItem" i ON i."orderId" = o.id
      WHERE o.status = 'PAID' AND o."paidAt" >= ${from} AND o."paidAt" < ${to}
      GROUP BY 1 ORDER BY 1`,
    prisma.orderItem.groupBy({ by: ['productId'], where: { order: paid }, _sum: { unitPrice: true }, _count: true, orderBy: { _sum: { unitPrice: 'desc' } }, take: 10 }),
    prisma.orderItem.groupBy({ by: ['sellerId'], where: { order: paid, sellerId: { not: null } }, _sum: { unitPrice: true, commission: true, sellerNet: true }, _count: true, orderBy: { _sum: { unitPrice: 'desc' } }, take: 10 }),
    prisma.order.groupBy({ by: ['couponCode'], where: { ...paid, couponCode: { not: null } }, _sum: { discount: true }, _count: true, orderBy: { _sum: { discount: 'desc' } }, take: 10 }),
    prisma.$queryRaw<{ month: Date, sellerId: string, net: bigint, commission: bigint, lines: bigint }[]>`
      SELECT date_trunc('month', o."paidAt") AS month, i."sellerId", sum(i."sellerNet") AS net, sum(i.commission) AS commission, count(*) AS lines
      FROM "Order" o JOIN "OrderItem" i ON i."orderId" = o.id
      WHERE o.status = 'PAID' AND o."paidAt" >= ${from} AND o."paidAt" < ${to} AND i."sellerId" IS NOT NULL
      GROUP BY 1, 2 ORDER BY 1 DESC, 3 DESC`,
  ])
  const [products, sellers, payouts] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: topProducts.map(p => p.productId) } }, select: { id: true, slug: true, title: true } }),
    prisma.seller.findMany({ where: { id: { in: [...new Set([...topSellers.map(s => s.sellerId!), ...settlement.map(s => s.sellerId)])] } }, select: { id: true, displayName: true } }),
    prisma.$queryRaw<{ month: Date, sellerId: string, paid: bigint }[]>`
      SELECT date_trunc('month', "paidAt") AS month, "sellerId", sum(amount) AS paid FROM "Payout"
      WHERE status = 'PAID' AND "paidAt" >= ${from} AND "paidAt" < ${to} GROUP BY 1, 2`,
  ])
  const name = (id: string | null) => sellers.find(s => s.id === id)?.displayName ?? '—'
  const n = (v: bigint | number | null | undefined) => Number(v ?? 0)
  return {
    from, to, group,
    totals: {
      lines: totals._count, gross: totals._sum.unitPrice ?? 0, discount: totals._sum.discount ?? 0,
      commission: totals._sum.commission ?? 0, sellerNet: totals._sum.sellerNet ?? 0,
      refunds: refunds._count, refunded: refunds._sum.total ?? 0,
      orders: series.reduce((a, r) => a + n(r.orders), 0),
    },
    series: series.map(r => ({ bucket: r.bucket, orders: n(r.orders), gross: n(r.gross), commission: n(r.commission) })),
    topProducts: topProducts.map(p => ({ ...products.find(x => x.id === p.productId), sales: p._count, gross: p._sum.unitPrice ?? 0 })),
    topSellers: topSellers.map(s => ({ id: s.sellerId, name: name(s.sellerId), sales: s._count, gross: s._sum.unitPrice ?? 0, commission: s._sum.commission ?? 0, net: s._sum.sellerNet ?? 0 })),
    coupons: coupons.map(c => ({ code: c.couponCode, orders: c._count, discount: c._sum.discount ?? 0 })),
    settlement: settlement.map(s => ({
      month: s.month, sellerId: s.sellerId, name: name(s.sellerId), lines: n(s.lines), net: n(s.net), commission: n(s.commission),
      paidOut: n(payouts.find(p => p.sellerId === s.sellerId && p.month.getTime() === s.month.getTime())?.paid),
    })),
  }
}
