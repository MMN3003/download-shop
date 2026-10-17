export default defineEventHandler(async (event) => {
  const { request } = await ownRequest(event)
  if (request.unreadUser) await prisma.productRequest.update({ where: { id: request.id }, data: { unreadUser: false } })
  return toPublicRequest(request)
})
