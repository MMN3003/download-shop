import { z } from 'zod'

/** Pay (or retry paying) an unpaid order, possibly with another method. */
export default defineEventHandler(async (event) => {
  const order = await ownOrder(event)
  const { method, locale } = await readValidatedBody(event, z.object({ method: z.string(), locale: z.string().default('fa') }).parse)
  if (!['PENDING_PAYMENT', 'REJECTED'].includes(order.status)) throw createError({ statusCode: 409, message: 'This order can no longer be paid' })
  return startPayment(event, order.id, method, locale)
})
