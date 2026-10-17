export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const id = getRouterParam(event, 'id')!
  await prisma.blogPost.delete({ where: { id } })
  await logAdmin(user.id, 'blog.delete', id)
  return { ok: true }
})
