import { z } from 'zod'

const body = z.object({
  displayName: z.string().transform(v => plainText(v, 80)).pipe(z.string().min(2, 'Write a shop name')),
  slug: slugSchema,
  bio: z.string().optional().transform(v => plainText(v, 1000) || null),
  terms: z.literal(true, { message: 'Accept the seller terms' }),
  percent: percentSchema.nullish(),
  note: z.string().optional().transform(v => plainText(v, 1000) || null),
})

/** Apply to sell. The store reviews the application; an optional commission proposal goes with it. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const data = await readValidatedBody(event, body.parse)
  const { marketplace } = await getSettings()
  if (!marketplace.sellersOpen) throw createError({ statusCode: 403, message: 'Seller sign-up is closed for now' })
  const existing = await prisma.seller.findUnique({ where: { userId: user.id } })
  if (existing && existing.status !== 'rejected') throw createError({ statusCode: 409, message: 'You have already applied' })
  const clash = await prisma.seller.findFirst({ where: { slug: data.slug.toLowerCase(), NOT: { userId: user.id } } })
  if (clash) throw createError({ statusCode: 409, message: 'This shop address is taken' })
  const fields = { displayName: data.displayName, slug: data.slug.toLowerCase(), bio: data.bio, termsAt: new Date(), status: 'pending', reviewNote: null }
  const seller = existing
    ? await prisma.seller.update({ where: { id: existing.id }, data: fields })
    : await prisma.seller.create({ data: { ...fields, userId: user.id } })
  if (data.percent != null) {
    await prisma.commissionAgreement.create({ data: { sellerId: seller.id, percent: data.percent, proposedBy: 'seller', note: data.note } })
  }
  return { status: seller.status }
})
