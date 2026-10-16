/** Everything the buyer owns, with the current file, downloads used and an "updated" flag. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { downloadLimit } = await getSettings()
  const items = await prisma.libraryItem.findMany({
    where: { userId: user.id, revoked: false },
    include: { product: { include: productInclude }, downloads: { orderBy: { createdAt: 'desc' } } },
    orderBy: { createdAt: 'desc' },
  })
  return items.map((it) => {
    const files = it.product.files.filter(f => f.kind !== 'SAMPLE')
    const last = it.downloads[0]?.createdAt
    return {
      productId: it.productId,
      product: toProductCard(it.product),
      addedAt: it.createdAt,
      files: files.map(f => ({ id: f.id, kind: f.kind, filename: f.filename, size: f.size, version: f.version, changelog: f.changelog, updatedAt: f.createdAt })),
      downloadsUsed: it.downloads.length,
      downloadLimit,
      updatedSinceDownload: !!last && files.some(f => f.createdAt > last),
    }
  })
})
