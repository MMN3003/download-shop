export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const id = getRouterParam(event, 'id')!
  const count = await prisma.product.count({ where: { productTypeId: id } })
  if (count) throw createError({ statusCode: 409, message: `${count} products use this type; move or delete them first` })
  await prisma.productType.delete({ where: { id } })
  await logAdmin(user.id, 'productType.delete', id)
  return { ok: true }
})
