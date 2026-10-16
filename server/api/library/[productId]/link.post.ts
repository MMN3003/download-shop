import { z } from 'zod'

/** A short-lived download link for a file the buyer owns. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { fileId } = await readValidatedBody(event, z.object({ fileId: z.string() }).parse)
  const item = await prisma.libraryItem.findUnique({ where: { userId_productId: { userId: user.id, productId: getRouterParam(event, 'productId')! } }, include: { _count: { select: { downloads: true } } } })
  if (!item || item.revoked) throw createError({ statusCode: 403, message: 'You do not own this product' })
  const file = await prisma.productFile.findFirst({ where: { id: fileId, productId: item.productId, isCurrent: true, kind: { not: 'SAMPLE' } } })
  if (!file) throw createError({ statusCode: 404, message: 'File not found' })
  const { downloadLimit } = await getSettings()
  if (downloadLimit && item._count.downloads >= downloadLimit) throw createError({ statusCode: 429, message: 'Download limit reached. Contact support for more downloads.' })
  return { url: `/dl/${makeDownloadToken(item.id, file.id)}` }
})
