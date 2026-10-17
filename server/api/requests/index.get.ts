export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const rows = await prisma.productRequest.findMany({ where: { userId: user.id }, include: { product: { select: { slug: true, title: true } } }, orderBy: { updatedAt: 'desc' } })
  return rows.map(toPublicRequest)
})
