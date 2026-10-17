import { z } from 'zod'

/** Refuse a manual transfer with a reason. The buyer is told and can upload again. */
export default defineEventHandler(async (event) => {
  const user = await requireSupport(event)
  const id = getRouterParam(event, 'id')!
  const { reason } = await readValidatedBody(event, z.object({ reason: z.string().trim().min(3).max(500) }).parse)
  const { count } = await prisma.payment.updateMany({ where: { id, status: 'SUBMITTED' }, data: { status: 'REJECTED', rejectReason: reason, reviewedById: user.id, reviewedAt: new Date() } })
  if (!count) throw createError({ statusCode: 409, message: 'This payment was already reviewed' })
  const p = await prisma.payment.findUniqueOrThrow({ where: { id }, include: { order: { include: { user: true } } } })
  await prisma.order.updateMany({ where: { id: p.orderId, status: 'AWAITING_VERIFICATION' }, data: { status: 'REJECTED' } })
  await notifyUser(p.order.user, `Order #${p.order.number}: receipt not accepted`, `رسید سفارش #${p.order.number} تأیید نشد: ${reason}\nمی‌توانید رسید درست را دوباره بارگذاری کنید.\nReceipt for order #${p.order.number} was not accepted: ${reason}`)
  await logAdmin(user.id, 'payment.reject', id, { reason })
  return { ok: true }
})
