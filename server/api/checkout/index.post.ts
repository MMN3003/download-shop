import { z } from 'zod'

const body = z.object({ ids: z.array(z.string()).min(1).max(100), method: z.string().optional(), locale: z.string().default('fa') })

/**
 * Create an order for the cart. Products the buyer already owns are skipped;
 * a zero total is granted at once. Otherwise payment starts with `method`.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { ids, method, locale } = await readValidatedBody(event, body.parse)
  const quote = await quoteProducts(ids, user.id)
  const items = quote.items.filter(i => !i.owned)
  if (!items.length) throw createError({ statusCode: 409, message: 'You already own everything in your cart' })
  const settings = await getSettings()
  const order = await prisma.order.create({
    data: {
      userId: user.id, subtotal: quote.total, total: quote.total, currency: settings.currency,
      items: { create: items.map(i => ({ productId: i.id, sellerId: i.sellerId, title: i.title as any, unitPrice: i.finalPrice })) },
    },
  })
  const prefix = locale === 'fa' ? '' : `/${locale}`
  if (order.total === 0) {
    await markOrderPaid(order.id)
    return { number: order.number, next: `${prefix}/library` }
  }
  if (!method) return { number: order.number, next: `${prefix}/orders/${order.number}` }
  // If the gateway fails, the order still exists and can be paid from its page
  try {
    return { number: order.number, ...(await startPayment(event, order.id, method, locale)) }
  }
  catch (e: any) {
    return { number: order.number, next: `${prefix}/orders/${order.number}`, error: e?.message ?? 'Payment could not start' }
  }
})
