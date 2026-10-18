import { z } from 'zod'

const body = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().optional().transform(v => plainText(v, 2000) || null),
})

/** Write or edit one's review. Only buyers who own the product may. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const data = await readValidatedBody(event, body.parse)
  const { reviews } = await getSettings()
  if (!reviews.enabled) throw createError({ statusCode: 403, message: 'Reviews are closed' })
  const p = await prisma.product.findFirst({ where: { slug: getRouterParam(event, 'slug')!, status: 'PUBLISHED' } })
  if (!p) throw createError({ statusCode: 404, message: 'Not found' })
  if (!await prisma.libraryItem.count({ where: { userId: user.id, productId: p.id, revoked: false } })) {
    throw createError({ statusCode: 403, message: 'Only buyers of this product can review it' })
  }
  const prev = await prisma.review.findUnique({ where: { productId_userId: { productId: p.id, userId: user.id } } })
  // A hidden review stays hidden when edited; otherwise moderation decides
  const status = prev?.status === 'hidden' ? 'hidden' : reviews.moderate ? 'pending' : 'published'
  const r = await prisma.review.upsert({
    where: { productId_userId: { productId: p.id, userId: user.id } },
    create: { ...data, status, productId: p.id, userId: user.id },
    update: { ...data, status },
    include: { user: { select: { name: true } } },
  })
  await refreshRating(p.id)
  return toPublicReview(r)
})
