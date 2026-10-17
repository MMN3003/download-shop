export default defineEventHandler(async (event) => {
  await catalogAccess(event)
  return prisma.productType.findMany({ orderBy: { createdAt: 'asc' }, include: { attributes: { orderBy: { sortOrder: 'asc' } }, _count: { select: { products: true } } } })
})
