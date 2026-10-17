export default defineEventHandler(async (event) => {
  await catalogAccess(event)
  const t = await prisma.productType.findUnique({ where: { id: getRouterParam(event, 'id')! }, include: { attributes: { orderBy: { sortOrder: 'asc' } } } })
  if (!t) throw createError({ statusCode: 404, message: 'Not found' })
  return t
})
