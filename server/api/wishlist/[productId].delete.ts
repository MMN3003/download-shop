export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  await prisma.wishlistItem.deleteMany({ where: { userId: user.id, productId: getRouterParam(event, 'productId')! } })
  return { saved: false }
})
