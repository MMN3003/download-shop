export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const id = getRouterParam(event, 'id')!
  // Sold bundles keep their order lines (bundleId is cleared), buyers keep their products
  await prisma.bundle.delete({ where: { id } })
  await logAdmin(user.id, 'bundle.delete', id)
  return { ok: true }
})
