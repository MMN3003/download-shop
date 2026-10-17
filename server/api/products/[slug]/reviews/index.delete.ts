export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const p = await prisma.product.findUnique({ where: { slug: getRouterParam(event, 'slug')! }, select: { id: true } })
  if (!p) throw createError({ statusCode: 404, message: 'Not found' })
  await prisma.review.deleteMany({ where: { productId: p.id, userId: user.id } })
  await refreshRating(p.id)
  return { ok: true }
})
