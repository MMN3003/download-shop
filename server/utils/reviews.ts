/** Keep a product's average and count in step with its published reviews. */
export async function refreshRating(productId: string) {
  const agg = await prisma.review.aggregate({ where: { productId, status: 'published' }, _avg: { rating: true }, _count: true })
  await prisma.product.update({ where: { id: productId }, data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count } })
}

/** Reviews show the buyer's first name only. */
export function reviewerName(u: { name: string | null }) {
  return u.name?.trim().split(/\s+/)[0] || null
}

export const toPublicReview = (r: { id: string, rating: number, body: string | null, status: string, sellerReply: string | null, repliedAt: Date | null, createdAt: Date, updatedAt: Date, user: { name: string | null } }) => ({
  id: r.id, rating: r.rating, body: r.body, status: r.status, sellerReply: r.sellerReply, repliedAt: r.repliedAt, createdAt: r.createdAt, edited: r.updatedAt.getTime() - r.createdAt.getTime() > 60_000, name: reviewerName(r.user),
})

/** Staff (owner, editor, support) see every review; an approved seller sees reviews of their products. */
export async function reviewAccess(event: import('h3').H3Event) {
  const user = await requireRole(event, ['OWNER', 'EDITOR', 'SUPPORT', 'SELLER'])
  if (user.role !== 'SELLER') return { user, staff: true, seller: null }
  const seller = await prisma.seller.findUnique({ where: { userId: user.id } })
  if (seller?.status !== 'approved') throw createError({ statusCode: 403, message: 'Not allowed' })
  return { user, staff: false, seller }
}
