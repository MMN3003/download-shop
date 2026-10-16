export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const id = getRouterParam(event, 'id')!
  const files = await prisma.productFile.findMany({ where: { productId: id } })
  await prisma.product.delete({ where: { id } })
  for (const f of files) await deleteFile('private', f.storageKey)
  await logAdmin(user.id, 'product.delete', id)
  return { ok: true }
})
