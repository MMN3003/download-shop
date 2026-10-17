export default defineEventHandler(async (event) => {
  await catalogAccess(event)
  const sections = await prisma.section.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
  const counts = await Promise.all(sections.map(async s => prisma.product.count({ where: await productsInSection(s.id) })))
  return sections.map((s, i) => ({ ...s, bannerUrl: publicUrl(s.banner), productCount: counts[i] }))
})
