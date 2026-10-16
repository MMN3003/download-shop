export default defineEventHandler(async (event) => {
  await requireEditor(event)
  return prisma.productType.findMany({ orderBy: { createdAt: 'asc' }, include: { attributes: { orderBy: { sortOrder: 'asc' } }, _count: { select: { products: true } } } })
})
