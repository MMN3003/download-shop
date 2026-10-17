/** The buyer's recent downloads, newest first. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const rows = await prisma.download.findMany({
    where: { userId: user.id },
    include: { libraryItem: { include: { product: { select: { slug: true, title: true } } } } },
    orderBy: { createdAt: 'desc' }, take: 50,
  })
  const files = await prisma.productFile.findMany({ where: { id: { in: [...new Set(rows.map(r => r.fileId))] } }, select: { id: true, filename: true, version: true } })
  return rows.map(r => ({
    at: r.createdAt, product: r.libraryItem.product,
    file: files.find(f => f.id === r.fileId) ?? null,
  }))
})
