import { z } from 'zod'

const body = z.object({
  action: z.enum(['accept', 'reject', 'withdraw']),
  answer: z.string().optional().transform(v => plainText(v, 1000) || null),
})

/** Accept or turn down the store's offer, or withdraw one's own proposal. */
export default defineEventHandler(async (event) => {
  const { seller, user } = await approvedSeller(event)
  const { action, answer } = await readValidatedBody(event, body.parse)
  const a = await prisma.commissionAgreement.findFirst({ where: { id: getRouterParam(event, 'id')!, sellerId: seller.id, status: 'PROPOSED' } })
  if (!a) throw createError({ statusCode: 404, message: 'Not found' })
  const mine = a.proposedBy === 'seller'
  if (mine !== (action === 'withdraw')) throw createError({ statusCode: 422, message: mine ? 'You can only withdraw your own proposal' : 'Accept or reject the store\'s offer' })
  const status = { accept: 'ACCEPTED', reject: 'REJECTED', withdraw: 'WITHDRAWN' }[action] as 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'
  // Guarded so a double click can't decide twice
  const done = await prisma.commissionAgreement.updateMany({
    where: { id: a.id, status: 'PROPOSED' },
    data: { status, answer, decidedById: user.id, decidedAt: new Date(), ...(status === 'ACCEPTED' && a.startsAt < new Date() ? { startsAt: new Date() } : {}) },
  })
  if (!done.count) throw createError({ statusCode: 409, message: 'Already decided' })
  return { status }
})
