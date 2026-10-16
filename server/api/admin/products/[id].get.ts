export default defineEventHandler(async (event) => {
  await requireEditor(event)
  const p = await prisma.product.findUnique({
    where: { id: getRouterParam(event, 'id')! },
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
