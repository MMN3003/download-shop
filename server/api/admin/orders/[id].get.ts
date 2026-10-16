import { getPaymentMethod } from '../../../payment-methods'

/** One order with its payments, plus warnings that help spot reused receipts. */
export default defineEventHandler(async (event) => {
  await requireSupport(event)
  const order = await prisma.order.findUnique({
    where: { id: getRouterParam(event, 'id')! },
    include: { user: { select: { id: true, name: true, phone: true, email: true, createdAt: true } }, items: { include: { product: { select: { slug: true } } } }, payments: { orderBy: { createdAt: 'desc' } } },
  })
  if (!order) throw createError({ statusCode: 404, message: 'Order not found' })
  const payments = await Promise.all(order.payments.map(async (p) => {
    const warnings: { kind: string, orderNumber: number }[] = []
    if (p.reference || p.receiptHash) {
      const others = await prisma.payment.findMany({
        where: { id: { not: p.id }, orderId: { not: order.id }, OR: [...(p.reference ? [{ reference: p.reference }] : []), ...(p.receiptHash ? [{ receiptHash: p.receiptHash }] : [])] },
        include: { order: { select: { number: true } } },
      })
      for (const o of others) {
        if (p.reference && o.reference === p.reference) warnings.push({ kind: 'duplicateReference', orderNumber: o.order.number })
        if (p.receiptHash && o.receiptHash === p.receiptHash) warnings.push({ kind: 'duplicateReceipt', orderNumber: o.order.number })
      }
    }
    const { raw: _raw, receiptHash: _h, ...rest } = p
    const unique = warnings.filter((w, i) => warnings.findIndex(x => x.kind === w.kind && x.orderNumber === w.orderNumber) === i)
    return { ...rest, methodName: getPaymentMethod(p.method)?.name ?? { fa: p.method, en: p.method }, hasReceipt: !!p.receiptKey, receiptIsPdf: !!p.receiptKey?.endsWith('.pdf'), warnings: unique }
  }))
  const previousPaid = await prisma.order.count({ where: { userId: order.userId, status: 'PAID', id: { not: order.id } } })
  return { ...order, payments, previousPaid }
})
