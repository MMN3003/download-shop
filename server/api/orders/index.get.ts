export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const orders = await prisma.order.findMany({ where: { userId: user.id }, include: orderInclude, orderBy: { createdAt: 'desc' }, take: 100 })
  return Promise.all(orders.map(toPublicOrder))
})
