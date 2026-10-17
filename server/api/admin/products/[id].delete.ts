export default defineEventHandler(async (event) => {
  const access = await catalogAccess(event)
  const { id } = await productForAccess(access, getRouterParam(event, 'id')!)
  // Buyers keep access to what they paid for, so sold products are hidden, not deleted
  if (await prisma.orderItem.count({ where: { productId: id } })) {
    throw createError({ statusCode: 409, message: 'This product has orders. Hide it instead of deleting it.' })
  }
  const files = await prisma.productFile.findMany({ where: { productId: id } })
  await prisma.product.delete({ where: { id } })
  for (const f of files) await deleteFile('private', f.storageKey)
  await logAdmin(access.user.id, 'product.delete', id)
  return { ok: true }
})
