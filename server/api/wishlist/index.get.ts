export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const rows = await prisma.wishlistItem.findMany({ where: { userId: user.id, product: { status: 'PUBLISHED' } }, include: { product: { include: productInclude } }, orderBy: { createdAt: 'desc' } })
  return rows.map(r => toProductCard(r.product))
})
