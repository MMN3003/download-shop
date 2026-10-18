import { verifyTorobpay } from '../../../payment-methods/torobpay'

/**
 * The buyer returns here from Torob Pay, which POSTs transactionId, state (OK|FAILED) and amount.
 * The state is only a hint: the payment counts once Torob confirms it in verify.
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const form = event.method === 'POST' ? Object.fromEntries(new URLSearchParams(await readRawBody(event) ?? '')) : q
  const payment = await prisma.payment.findUnique({ where: { id: String(q.p ?? '') }, include: { order: true } })
  if (!payment || payment.method !== 'torobpay' || !payment.authority || payment.authority !== form.transactionId) {
    throw createError({ statusCode: 400, message: 'Unknown payment' })
  }
  const prefix = q.l && q.l !== 'fa' ? `/${q.l}` : ''
  const page = `${prefix}/orders/${payment.order.number}`
  // 303 so the browser follows a POST with a GET
  if (payment.status === 'PAID') return sendRedirect(event, `${page}?paid=1`, 303)
  if (form.state !== 'OK') {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
    return sendRedirect(event, `${page}?failed=1`, 303)
  }
  const result = await verifyTorobpay(payment)
  if (!result.ok) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', raw: result.raw as any } })
    return sendRedirect(event, `${page}?failed=1`, 303)
  }
  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID', refId: payment.authority, raw: result.raw as any } })
  await markOrderPaid(payment.orderId)
  return sendRedirect(event, `${page}?paid=1`, 303)
})
