export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const id = getRouterParam(event, 'id')!
  const data = blogRow(await readValidatedBody(event, blogInput.parse))
  const prev = await prisma.blogPost.findUnique({ where: { id } })
  if (!prev) throw createError({ statusCode: 404, message: 'Not found' })
  if (await prisma.blogPost.count({ where: { slug: data.slug, id: { not: id } } })) throw createError({ statusCode: 409, message: 'This slug is already used' })
  const p = await prisma.blogPost.update({ where: { id }, data: { ...data, publishedAt: data.status === 'published' ? (prev.publishedAt ?? new Date()) : prev.publishedAt } })
  await logAdmin(user.id, 'blog.update', id, { status: data.status })
  return p
})
