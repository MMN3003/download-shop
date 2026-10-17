/** Streams a purchased file for a valid signed link and counts the download. */
export default defineEventHandler(async (event) => {
  const t = readDownloadToken(getRouterParam(event, 'token') ?? '')
  if (!t) throw createError({ statusCode: 410, message: 'This download link has expired. Open your library to get a new one.' })
  const item = await prisma.libraryItem.findUnique({ where: { id: t.libraryItemId }, include: { _count: { select: { downloads: true } } } })
  const file = await prisma.productFile.findUnique({ where: { id: t.fileId } })
  if (!item || item.revoked || !file || file.productId !== item.productId) throw createError({ statusCode: 403, message: 'Not allowed' })
  const { downloadLimit } = await getSettings()
  if (downloadLimit && item._count.downloads >= downloadLimit) throw createError({ statusCode: 429, message: 'Download limit reached' })
  const data = await getFile('private', file.storageKey)
  await prisma.download.create({ data: { libraryItemId: item.id, userId: item.userId, fileId: file.id, ip: getRequestIP(event, { xForwardedFor: true }) } })
  setHeaders(event, {
    'content-type': file.mimeType || 'application/octet-stream',
    'content-length': data.length,
    'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
  })
  return data
})
