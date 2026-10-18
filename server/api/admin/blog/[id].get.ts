export default defineEventHandler(async (event) => {
  await requireEditor(event)
  const p = await prisma.blogPost.findUnique({ where: { id: getRouterParam(event, 'id')! } })
  if (!p) throw createError({ statusCode: 404, message: 'Not found' })
  return { ...p, coverUrl: publicUrl(p.cover) }
})
