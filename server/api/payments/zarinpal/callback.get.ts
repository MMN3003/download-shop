import { verifyZarinpal } from '../../../payment-methods/zarinpal'

/** The buyer returns here from ZarinPal. Verify, mark paid, and send them to the order page. */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const payment = await prisma.payment.findUnique({ where: { id: String(q.p ?? '') }, include: { order: true } })
  if (!payment || payment.method !== 'zarinpal' || payment.authority !== q.Authority) {
    throw createError({ statusCode: 400, message: 'Unknown payment' })
  }
  const prefix = q.l && q.l !== 'fa' ? `/${q.l}` : ''
  const page = `${prefix}/orders/${payment.order.number}`
  if (payment.status === 'PAID') return sendRedirect(event, `${page}?paid=1`)
  if (q.Status !== 'OK') {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
    return sendRedirect(event, `${page}?failed=1`)
  }
  const result = await verifyZarinpal(await getSettings(), payment.amount, payment.authority!)
  if (!result.ok) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', raw: result.raw } })
    return sendRedirect(event, `${page}?failed=1`)
  }
  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID', refId: result.refId, cardPan: result.cardPan, raw: result.raw } })
  await markOrderPaid(payment.orderId)
  return sendRedirect(event, `${page}?paid=1`)
})
