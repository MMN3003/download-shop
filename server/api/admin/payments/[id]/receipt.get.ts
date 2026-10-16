export default defineEventHandler(async (event) => {
  await requireSupport(event)
  const p = await prisma.payment.findUnique({ where: { id: getRouterParam(event, 'id')! } })
  if (!p?.receiptKey) throw createError({ statusCode: 404, message: 'No receipt' })
  const ext = p.receiptKey.split('.').pop()
  setHeaders(event, { 'content-type': { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' }[ext ?? ''] ?? 'application/octet-stream', 'cache-control': 'private, no-store' })
  return getFile('private', p.receiptKey)
})
