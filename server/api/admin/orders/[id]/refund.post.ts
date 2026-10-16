import { z } from 'zod'

/** Record a refund (money is returned outside the store) and remove access. */
export default defineEventHandler(async (event) => {
  const user = await requireOwner(event)
  const id = getRouterParam(event, 'id')!
  const { note } = await readValidatedBody(event, z.object({ note: z.string().max(500).optional() }).parse)
  const order = await prisma.order.findUniqueOrThrow({ where: { id }, include: { items: true } })
  if (order.status !== 'PAID') throw createError({ statusCode: 409, message: 'Only paid orders can be refunded' })
  await prisma.$transaction([
    prisma.order.update({ where: { id }, data: { status: 'REFUNDED', adminNote: note || order.adminNote } }),
    prisma.libraryItem.updateMany({ where: { orderId: id }, data: { revoked: true } }),
    ...order.items.map(i => prisma.product.update({ where: { id: i.productId }, data: { salesCount: { decrement: 1 } } })),
  ])
  await logAdmin(user.id, 'order.refund', id, { note })
  return { ok: true }
})
