import { z } from 'zod'

const body = z.object({
  action: z.enum(['accept', 'reject', 'end']),
  answer: z.string().optional().transform(v => plainText(v, 1000) || null),
})

/** Answer a seller's proposal, withdraw a store offer, or end a rate that is in force. */
export default defineEventHandler(async (event) => {
  const admin = await requireOwner(event)
  const { action, answer } = await readValidatedBody(event, body.parse)
  const a = await prisma.commissionAgreement.findUnique({ where: { id: getRouterParam(event, 'id')! } })
  if (!a) throw createError({ statusCode: 404, message: 'Not found' })
  const now = new Date()
  let done
  if (action === 'end') {
    if (a.status !== 'ACCEPTED') throw createError({ statusCode: 422, message: 'Only a rate in force can be ended' })
    done = await prisma.commissionAgreement.updateMany({ where: { id: a.id, status: 'ACCEPTED' }, data: { endsAt: now } })
  }
  else {
    if (a.status !== 'PROPOSED') throw createError({ statusCode: 409, message: 'Already decided' })
    if (action === 'accept' && a.proposedBy !== 'seller') throw createError({ statusCode: 422, message: 'The seller accepts the store\'s offers' })
    const status = action === 'accept' ? 'ACCEPTED' : (a.proposedBy === 'store' ? 'WITHDRAWN' : 'REJECTED')
    done = await prisma.commissionAgreement.updateMany({
      where: { id: a.id, status: 'PROPOSED' },
      data: { status, answer, decidedById: admin.id, decidedAt: now, ...(status === 'ACCEPTED' && a.startsAt < now ? { startsAt: now } : {}) },
    })
    if (done.count && a.proposedBy === 'seller') {
      await notifySeller(a.sellerId, 'Commission', action === 'accept' ? `پیشنهاد کمیسیون ${a.percent}٪ شما پذیرفته شد.` : `پیشنهاد کمیسیون ${a.percent}٪ شما رد شد.${answer ? ` ${answer}` : ''}`)
    }
  }
  if (!done.count) throw createError({ statusCode: 409, message: 'Already decided' })
  await logAdmin(admin.id, `agreement.${action}`, a.id)
  return { ok: true }
})
