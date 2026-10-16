export default defineEventHandler(async () => {
  const where = { status: 'PUBLISHED' as const }
  const [featured, newest, free, popular] = await Promise.all([
    prisma.product.findMany({ where: { ...where, featured: true }, include: productInclude, take: 8, orderBy: { publishedAt: 'desc' } }),
    prisma.product.findMany({ where, include: productInclude, take: 8, orderBy: { publishedAt: 'desc' } }),
    prisma.product.findMany({ where: { ...where, isFree: true }, include: productInclude, take: 8, orderBy: { publishedAt: 'desc' } }),
    prisma.product.findMany({ where, include: productInclude, take: 8, orderBy: [{ salesCount: 'desc' }, { ratingAvg: 'desc' }] }),
  ])
  const sections = await prisma.section.findMany({ where: { showOnHome: true }, orderBy: { sortOrder: 'asc' } })
  // Count published products in each section including its sub-sections
  const counts = await Promise.all(sections.map(async s => prisma.product.count({
    where: { AND: [{ status: 'PUBLISHED' }, await productsInSection(s.id)] },
  })))
  return {
    featured: featured.map(toProductCard),
    newest: newest.map(toProductCard),
    free: free.map(toProductCard),
    popular: popular.map(toProductCard),
    sections: sections.map((s, i) => ({ slug: s.slug, name: s.name, icon: s.icon, banner: publicUrl(s.banner), count: counts[i] })),
  }
})
