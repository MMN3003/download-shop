export default defineEventHandler(async (event) => {
  const order = await ownOrder(event)
  if (!['PENDING_PAYMENT', 'REJECTED'].includes(order.status)) throw createError({ statusCode: 409, message: 'This order can no longer be cancelled' })
  await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } })
  return { ok: true }
})
