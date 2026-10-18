import { z } from 'zod'
import { cancelTorobpay } from '../../../../payment-methods/torobpay'

/**
 * Refund and remove access. Torob Pay purchases are cancelled at Torob, which returns the money;
 * for other methods the money is returned outside the store and this only records it.
 */
export default defineEventHandler(async (event) => {
  const user = await requireOwner(event)
  const id = getRouterParam(event, 'id')!
  const { note } = await readValidatedBody(event, z.object({ note: z.string().max(500).optional() }).parse)
  const order = await prisma.order.findUniqueOrThrow({ where: { id }, include: { items: true } })
  if (order.status !== 'PAID') throw createError({ statusCode: 409, message: 'Only paid orders can be refunded' })
  const torob = await prisma.payment.findFirst({ where: { orderId: id, method: 'torobpay', status: 'PAID' } })
  if (torob) {
    const r = await cancelTorobpay(torob)
    if (!r.ok) throw createError({ statusCode: 502, message: `Torob Pay did not cancel the payment (${r.code})` })
    await prisma.payment.update({ where: { id: torob.id }, data: { raw: { ...(torob.raw as object), cancel: r.raw as any } } })
  }
  await prisma.$transaction([
    prisma.order.update({ where: { id }, data: { status: 'REFUNDED', adminNote: note || order.adminNote } }),
    prisma.libraryItem.updateMany({ where: { orderId: id }, data: { revoked: true } }),
    ...order.items.map(i => prisma.product.update({ where: { id: i.productId }, data: { salesCount: { decrement: 1 } } })),
  ])
  await logAdmin(user.id, 'order.refund', id, { note })
  return { ok: true }
})
