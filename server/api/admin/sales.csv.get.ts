/** Every paid order line in the range as CSV, for accounting. */
export default defineEventHandler(async (event) => {
  await requireOwner(event)
  const { from, to } = salesRange(getQuery(event) as Record<string, string>)
  const lines = await prisma.orderItem.findMany({
    where: { order: { status: { in: ['PAID', 'REFUNDED'] }, paidAt: { gte: from, lt: to } } },
    include: { order: { select: { number: true, paidAt: true, status: true, couponCode: true, paymentMethod: true } }, product: { select: { slug: true } } },
    orderBy: { order: { paidAt: 'asc' } },
  })
  const sellers = new Map((await prisma.seller.findMany({ select: { id: true, displayName: true } })).map(s => [s.id, s.displayName]))
  // Quote every cell; a leading = + - @ is neutralised so spreadsheets don't run it as a formula
  const cell = (v: unknown) => {
    let s = v == null ? '' : String(v)
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return `"${s.replace(/"/g, '""')}"`
  }
  const head = ['order', 'paid_at', 'status', 'product', 'title', 'seller', 'price_paid', 'discount', 'commission_percent', 'commission', 'seller_net', 'coupon', 'bundle', 'method']
  const rows = lines.map(l => [l.order.number, l.order.paidAt?.toISOString(), l.order.status, l.product.slug, localize(l.title, 'fa'), l.sellerId ? sellers.get(l.sellerId) : '', l.unitPrice, l.discount, l.commissionPercent, l.commission, l.sellerNet, l.order.couponCode, l.bundleId ? 'yes' : '', l.order.paymentMethod])
  setHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setHeader(event, 'content-disposition', `attachment; filename="sales-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv"`)
  // BOM so Excel reads Persian text correctly
  return '﻿' + [head, ...rows].map(r => r.map(cell).join(',')).join('\r\n')
})
