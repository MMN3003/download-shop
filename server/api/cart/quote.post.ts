import { z } from 'zod'

/** Prices for the cart (kept in a cookie on the client): bundles, owned items and the coupon applied. */
export default defineEventHandler(async (event) => {
  const { ids, coupon } = await readValidatedBody(event, z.object({ ids: z.array(z.string()).max(100), coupon: z.string().max(40).nullish() }).parse)
  const session = await getUserSession(event)
  const { lines: _l, couponId: _c, ...quote } = await priceCart(ids, (session.user as any)?.id, coupon)
  return quote
})
