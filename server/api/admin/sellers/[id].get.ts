export default defineEventHandler(async (event) => {
  await requireOwner(event)
  const s = await prisma.seller.findUnique({
    where: { id: getRouterParam(event, 'id')! },
    include: {
      user: { select: { id: true, email: true, phone: true, name: true, role: true, createdAt: true } },
      agreements: { include: agreementInclude, orderBy: { createdAt: 'desc' } },
      payouts: { orderBy: { createdAt: 'desc' }, take: 50 },
      products: { select: { id: true, slug: true, title: true, status: true, salesCount: true }, orderBy: { updatedAt: 'desc' } },
    },
  })
  if (!s) throw createError({ statusCode: 404, message: 'Not found' })
  const sales = await prisma.orderItem.aggregate({ where: { sellerId: s.id, order: { status: 'PAID' } }, _sum: { unitPrice: true, commission: true, sellerNet: true }, _count: true })
  return {
    ...s, avatarUrl: publicUrl(s.avatar),
    rate: await currentRate(s.id), balance: await sellerBalance(s.id),
    totals: { sales: sales._count, gross: sales._sum.unitPrice ?? 0, commission: sales._sum.commission ?? 0, net: sales._sum.sellerNet ?? 0 },
  }
})
