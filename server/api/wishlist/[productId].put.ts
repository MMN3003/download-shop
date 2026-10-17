export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const productId = getRouterParam(event, 'productId')!
  if (!await prisma.product.count({ where: { id: productId, status: 'PUBLISHED' } })) throw createError({ statusCode: 404, message: 'Not found' })
  if (await prisma.wishlistItem.count({ where: { userId: user.id } }) >= 500) throw createError({ statusCode: 422, message: 'Your wishlist is full' })
  await prisma.wishlistItem.upsert({ where: { userId_productId: { userId: user.id, productId } }, create: { userId: user.id, productId }, update: {} })
  return { saved: true }
})
