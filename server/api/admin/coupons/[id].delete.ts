/** Codes that were used stay for the order history; they can only be switched off. */
export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const id = getRouterParam(event, 'id')!
  if (await prisma.order.count({ where: { couponId: id } })) throw createError({ statusCode: 409, message: 'This code was used in orders. Switch it off instead.' })
  await prisma.coupon.delete({ where: { id } })
  await logAdmin(user.id, 'coupon.delete', id)
  return { ok: true }
})
