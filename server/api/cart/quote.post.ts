import { z } from 'zod'

/** Prices for the cart (kept in a cookie on the client), with owned items marked. */
export default defineEventHandler(async (event) => {
  const { ids } = await readValidatedBody(event, z.object({ ids: z.array(z.string()).max(100) }).parse)
  const session = await getUserSession(event)
  return quoteProducts(ids, (session.user as any)?.id)
})
