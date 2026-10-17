/** Ids of saved products, to draw the heart on cards. Empty for guests. */
export default defineEventHandler(async (event) => {
  const userId = ((await getUserSession(event)).user as { id: string } | undefined)?.id
  if (!userId) return []
  return (await prisma.wishlistItem.findMany({ where: { userId }, select: { productId: true } })).map(r => r.productId)
})
