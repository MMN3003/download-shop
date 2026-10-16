export default defineEventHandler(async (event) => {
  await requireEditor(event)
  const sections = await prisma.section.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { _count: { select: { products: true } } } })
  return sections.map(s => ({ ...s, bannerUrl: publicUrl(s.banner), productCount: s._count.products }))
})
