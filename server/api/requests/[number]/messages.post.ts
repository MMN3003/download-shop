export default defineEventHandler(async (event) => {
  const { user, request } = await ownRequest(event)
  const { body } = await readValidatedBody(event, messageInput.parse)
  if (request.status === 'DECLINED') throw createError({ statusCode: 409, message: 'This request is closed' })
  const recent = await prisma.requestMessage.count({ where: { authorId: user.id, createdAt: { gt: new Date(Date.now() - 3600_000) } } })
  if (recent >= 20) throw createError({ statusCode: 429, message: 'Too many messages. Try again later.' })
  await prisma.$transaction([
    prisma.requestMessage.create({ data: { requestId: request.id, authorId: user.id, body } }),
    prisma.productRequest.update({ where: { id: request.id }, data: { unreadStaff: true } }),
  ])
  return { ok: true }
})
