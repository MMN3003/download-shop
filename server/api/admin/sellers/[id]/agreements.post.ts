import { z } from 'zod'

const body = z.object({
  percent: percentSchema,
  /** direct: the rate applies now; otherwise it is a counter-offer the seller has to accept */
  direct: z.boolean().default(false),
  startsAt: z.coerce.date().nullish(),
  endsAt: z.coerce.date().nullish(),
  note: z.string().optional().transform(v => plainText(v, 1000) || null),
  replyTo: z.string().nullish(),
}).and(agreementScope).refine(v => !v.endsAt || v.endsAt > (v.startsAt ?? new Date()), { message: 'The end must be after the start', path: ['endsAt'] })

/** The store sets a rate for a seller, or answers a proposal with a counter-offer. */
export default defineEventHandler(async (event) => {
  const admin = await requireOwner(event)
  const d = await readValidatedBody(event, body.parse)
  const sellerId = getRouterParam(event, 'id')!
  if (!await prisma.seller.count({ where: { id: sellerId } })) throw createError({ statusCode: 404, message: 'Not found' })
  if (d.productId && !await prisma.product.count({ where: { id: d.productId, sellerId } })) throw createError({ statusCode: 404, message: 'Product not found' })
  const a = await prisma.$transaction(async (tx) => {
    if (d.replyTo) {
      await tx.commissionAgreement.updateMany({ where: { id: d.replyTo, sellerId, status: 'PROPOSED', proposedBy: 'seller' }, data: { status: 'REJECTED', answer: d.note, decidedById: admin.id, decidedAt: new Date() } })
    }
    return tx.commissionAgreement.create({
      data: {
        sellerId, percent: d.percent, sectionId: d.sectionId, productId: d.productId, note: d.note, proposedBy: 'store',
        startsAt: d.startsAt ?? new Date(), endsAt: d.endsAt ?? null,
        ...(d.direct ? { status: 'ACCEPTED', decidedById: admin.id, decidedAt: new Date() } : {}),
      },
    })
  })
  await notifySeller(sellerId, 'Commission', d.direct
    ? `کمیسیون شما ${d.percent}٪ تعیین شد.`
    : `پیشنهاد کمیسیون ${d.percent}٪ برای شما ثبت شد. در پنل فروشنده پاسخ دهید.`)
  await logAdmin(admin.id, d.direct ? 'agreement.set' : 'agreement.offer', a.id, { sellerId, percent: d.percent })
  return a
})
