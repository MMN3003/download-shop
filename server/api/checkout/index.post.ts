import { z } from 'zod'

const body = z.object({ ids: z.array(z.string()).min(1).max(100), method: z.string().optional(), locale: z.string().default('fa'), coupon: z.string().max(40).nullish() })

/**
 * Create an order for the cart. Products the buyer already owns are skipped;
 * a zero total is granted at once. Otherwise payment starts with `method`.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { ids, method, locale, coupon } = await readValidatedBody(event, body.parse)
  const quote = await priceCart(ids, user.id, coupon)
  // A code that stopped working since the cart was shown must not be dropped silently
  if (quote.couponError) throw createError({ statusCode: 422, message: `Coupon: ${quote.couponError}`, data: { coupon: quote.couponError, min: quote.couponMin } })
  if (!quote.lines.length) throw createError({ statusCode: 409, message: 'You already own everything in your cart' })
  const settings = await getSettings()
  const order = await prisma.order.create({
    data: {
      userId: user.id, subtotal: quote.subtotal, discount: quote.discount, total: quote.total, currency: settings.currency,
      couponId: quote.couponId, couponCode: quote.coupon?.code ?? null,
      items: { create: quote.lines.map(l => ({ productId: l.productId, sellerId: l.sellerId, title: l.title as any, unitPrice: l.unitPrice, discount: l.discount, bundleId: l.bundleId })) },
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
