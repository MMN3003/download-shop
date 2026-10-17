export default defineEventHandler(async (event) => {
  await requireEditor(event)
  const items = await prisma.blogPost.findMany({ orderBy: { updatedAt: 'desc' }, include: { author: { select: { name: true } } } })
  return items.map(p => ({ id: p.id, slug: p.slug, title: p.title, status: p.status, publishedAt: p.publishedAt, updatedAt: p.updatedAt, cover: publicUrl(p.cover), author: p.author?.name }))
})
