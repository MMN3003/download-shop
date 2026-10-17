import { z } from 'zod'

const body = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().optional().transform(v => plainText(v, 1000) || null),
})

/** The review queue: publish a seller's product, or send it back with a reason. */
export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const { action, note } = await readValidatedBody(event, body.parse)
  const p = await prisma.product.findUnique({ where: { id: getRouterParam(event, 'id')! } })
  if (!p) throw createError({ statusCode: 404, message: 'Not found' })
  if (action === 'reject' && !note) throw createError({ statusCode: 422, message: 'Write why, so the seller can fix it' })
  const updated = await prisma.product.update({
    where: { id: p.id },
    data: action === 'approve'
      ? { status: 'PUBLISHED', reviewNote: null, publishedAt: p.publishedAt ?? new Date() }
      : { status: 'DRAFT', reviewNote: note },
  })
  const title = localize(p.title, 'fa') || p.slug
  if (p.sellerId) {
    await notifySeller(p.sellerId, action === 'approve' ? 'Product published' : 'Product needs changes',
      action === 'approve' ? `«${title}» منتشر شد.` : `«${title}» نیاز به اصلاح دارد: ${note}`)
  }
  await logAdmin(user.id, `product.review.${action}`, p.id, { note })
  return { status: updated.status }
})
