/** Free sample file of a product, open to everyone. */
export default defineEventHandler(async (event) => {
  const p = await prisma.product.findUnique({ where: { slug: decodeURIComponent(getRouterParam(event, 'slug')!) }, include: { files: { where: { kind: 'SAMPLE', isCurrent: true }, orderBy: { createdAt: 'desc' }, take: 1 } } })
  const file = p?.status === 'PUBLISHED' ? p.files[0] : undefined
  if (!file) throw createError({ statusCode: 404, message: 'No sample' })
  const data = await getFile('private', file.storageKey)
  setHeaders(event, { 'content-type': file.mimeType || 'application/octet-stream', 'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}` })
  return data
})
