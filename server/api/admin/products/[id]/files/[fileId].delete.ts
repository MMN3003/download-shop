export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const productId = getRouterParam(event, 'id')!
  const f = await prisma.productFile.findFirst({ where: { id: getRouterParam(event, 'fileId')!, productId } })
  if (!f) throw createError({ statusCode: 404, message: 'Not found' })
  await prisma.productFile.delete({ where: { id: f.id } })
  await deleteFile('private', f.storageKey)
  // Promote the newest remaining file of that kind
  const next = await prisma.productFile.findFirst({ where: { productId, kind: f.kind }, orderBy: { createdAt: 'desc' } })
  if (f.isCurrent && next) await prisma.productFile.update({ where: { id: next.id }, data: { isCurrent: true } })
  await logAdmin(user.id, 'product.file.delete', productId, { file: f.id })
  return { ok: true }
})
