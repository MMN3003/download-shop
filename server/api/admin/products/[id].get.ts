export default defineEventHandler(async (event) => {
  const access = await catalogAccess(event)
  const { id } = await productForAccess(access, getRouterParam(event, 'id')!)
  const p = await prisma.product.findUnique({
    where: { id },
    include: { ...productInclude, files: { orderBy: { createdAt: 'desc' } } },
  })
  if (!p) throw createError({ statusCode: 404, message: 'Not found' })
  return {
    ...p,
    coverUrl: publicUrl(p.cover),
    screenshotUrls: p.screenshots.map(s => publicUrl(s)),
    sectionIds: p.sections.map(s => s.sectionId),
    attributes: attributeMap(p),
    files: p.files.map(({ storageKey: _k, ...f }) => f),
  }
})
