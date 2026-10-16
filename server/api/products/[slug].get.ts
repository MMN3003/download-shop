export default defineEventHandler(async (event) => {
  const slug = decodeURIComponent(getRouterParam(event, 'slug')!)
  const p = await prisma.product.findUnique({ where: { slug }, include: productInclude })
  if (!p || p.status !== 'PUBLISHED') throw createError({ statusCode: 404, message: 'Product not found' })
  const related = await prisma.product.findMany({
    where: { status: 'PUBLISHED', id: { not: p.id }, sections: { some: { sectionId: { in: p.sections.map(s => s.sectionId) } } } },
    include: productInclude, take: 4, orderBy: { salesCount: 'desc' },
  })
  return { product: toPublicProduct(p), related: related.map(toProductCard) }
})
