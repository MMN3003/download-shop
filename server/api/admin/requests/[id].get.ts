export default defineEventHandler(async (event) => {
  await requireSupport(event)
  const r = await prisma.productRequest.findUnique({
    where: { id: getRouterParam(event, 'id')! },
    include: { ...requestInclude, user: { select: { id: true, name: true, phone: true, email: true } } },
  })
  if (!r) throw createError({ statusCode: 404, message: 'Request not found' })
  if (r.unreadStaff) await prisma.productRequest.update({ where: { id: r.id }, data: { unreadStaff: false } })
  const others = await prisma.productRequest.count({ where: { userId: r.userId, id: { not: r.id } } })
  return { ...r, others, options: (await requestOptions()).options }
})
