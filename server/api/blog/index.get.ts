export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page) || 1)
  const perPage = Math.min(24, Number(q.perPage) || 12)
  const where = { status: 'published', ...(q.tag ? { tags: { has: String(q.tag) } } : {}) }
  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({ where, orderBy: { publishedAt: 'desc' }, skip: (page - 1) * perPage, take: perPage }),
    prisma.blogPost.count({ where }),
  ])
  return { items: items.map(toBlogCard), total, page, perPage }
})
