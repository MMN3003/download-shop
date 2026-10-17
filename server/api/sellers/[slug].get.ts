/** A seller's public shop page. */
export default defineEventHandler(async (event) => {
  const s = await prisma.seller.findUnique({ where: { slug: getRouterParam(event, 'slug')! } })
  if (!s || s.status !== 'approved') throw createError({ statusCode: 404, message: 'Not found' })
  const products = await prisma.product.findMany({ where: { sellerId: s.id, status: 'PUBLISHED' }, include: productInclude, orderBy: { publishedAt: 'desc' }, take: 100 })
  return { seller: { ...publicSeller(s), since: s.createdAt }, products: products.map(toProductCard) }
})
