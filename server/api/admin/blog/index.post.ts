export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const data = blogRow(await readValidatedBody(event, blogInput.parse))
  if (await prisma.blogPost.count({ where: { slug: data.slug } })) throw createError({ statusCode: 409, message: 'This slug is already used' })
  const p = await prisma.blogPost.create({ data: { ...data, authorId: user.id, publishedAt: data.status === 'published' ? new Date() : null } })
  await logAdmin(user.id, 'blog.create', p.id)
  return p
})
