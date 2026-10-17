export default defineEventHandler(async (event) => {
  const p = await prisma.blogPost.findFirst({ where: { slug: getRouterParam(event, 'slug')!, status: 'published' }, include: { author: { select: { name: true } } } })
  if (!p) throw createError({ statusCode: 404, message: 'Not found' })
  const [products, more] = await Promise.all([
    p.productIds.length ? prisma.product.findMany({ where: { id: { in: p.productIds }, status: 'PUBLISHED' }, include: productInclude }) : [],
    prisma.blogPost.findMany({ where: { status: 'published', id: { not: p.id } }, orderBy: { publishedAt: 'desc' }, take: 3 }),
  ])
  return {
    ...toBlogCard(p), body: p.body, seoTitle: p.seoTitle, seoDesc: p.seoDesc, updatedAt: p.updatedAt, author: reviewerName(p.author ?? { name: null }),
    products: p.productIds.map(id => products.find(x => x.id === id)).filter(x => !!x).map(toProductCard),
    more: more.map(toBlogCard),
  }
})
