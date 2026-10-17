import { z } from 'zod'

const body = z.object({ amount: z.coerce.number().int().positive() })

/** Ask for the available balance (or part of it) to be paid to the seller's Sheba account. */
export default defineEventHandler(async (event) => {
  const { seller } = await approvedSeller(event)
  const { amount } = await readValidatedBody(event, body.parse)
  if (!seller.sheba) throw createError({ statusCode: 422, message: 'Add your Sheba number in your seller profile first' })
  const payout = await prisma.$transaction(async (tx) => {
    // One request at a time per seller, so two clicks can't both spend the same balance
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payout:${seller.id}`}))`
    const balance = await sellerBalance(seller.id, tx)
    if (amount < balance.minPayout) throw createError({ statusCode: 422, message: `The smallest payout is ${balance.minPayout}` })
    if (amount > balance.available) throw createError({ statusCode: 422, message: 'This is more than your available balance' })
    return tx.payout.create({ data: { sellerId: seller.id, amount, sheba: seller.sheba! } })
  })
  return payout
})
