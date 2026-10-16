/** Accept a manual transfer: the order becomes paid and the buyer gets access. */
export default defineEventHandler(async (event) => {
  const user = await requireSupport(event)
  const id = getRouterParam(event, 'id')!
  const { count } = await prisma.payment.updateMany({ where: { id, status: 'SUBMITTED' }, data: { status: 'PAID', reviewedById: user.id, reviewedAt: new Date() } })
  if (!count) throw createError({ statusCode: 409, message: 'This payment was already reviewed' })
  const p = await prisma.payment.findUniqueOrThrow({ where: { id } })
  await markOrderPaid(p.orderId)
  await logAdmin(user.id, 'payment.approve', id)
  return { ok: true }
})
