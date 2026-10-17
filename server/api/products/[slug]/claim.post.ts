/** Add a free product to the signed-in user's library. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const p = await prisma.product.findUnique({ where: { slug: decodeURIComponent(getRouterParam(event, 'slug')!) } })
  if (!p || p.status !== 'PUBLISHED') throw createError({ statusCode: 404, message: 'Product not found' })
  if (effectivePrice(p) !== 0) throw createError({ statusCode: 402, message: 'This product is not free' })
  await prisma.libraryItem.upsert({ where: { userId_productId: { userId: user.id, productId: p.id } }, create: { userId: user.id, productId: p.id }, update: { revoked: false } })
  return { ok: true }
})
