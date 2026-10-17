import { z } from 'zod'

const body = z.object({
  status: z.enum(['published', 'pending', 'hidden']).optional(),
  reply: z.string().nullish().transform(v => v == null ? undefined : plainText(v, 2000) || null),
})

/** Staff publish or hide a review; the product's seller (or staff) can answer it. */
export default defineEventHandler(async (event) => {
  const { user, staff, seller } = await reviewAccess(event)
  const data = await readValidatedBody(event, body.parse)
  const r = await prisma.review.findUnique({ where: { id: getRouterParam(event, 'id')! }, include: { product: true, user: true } })
  if (!r || (!staff && r.product.sellerId !== seller?.id)) throw createError({ statusCode: 404, message: 'Not found' })
  if (data.status && !staff) throw createError({ statusCode: 403, message: 'Not allowed' })
  const updated = await prisma.review.update({
    where: { id: r.id },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.reply !== undefined ? { sellerReply: data.reply, repliedAt: data.reply ? new Date() : null } : {}),
    },
  })
  if (data.status) await refreshRating(r.productId)
  if (data.reply && !r.sellerReply) {
    await notifyUser(r.user, 'Reply to your review', `به نظر شما دربارهٔ «${localize(r.product.title, 'fa')}» پاسخ داده شد.`)
  }
  await logAdmin(user.id, 'review.update', r.id, { status: data.status, replied: data.reply !== undefined })
  return { ok: true, status: updated.status }
})
