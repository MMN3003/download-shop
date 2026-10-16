export default defineEventHandler(async (event) => {
  const slug = decodeURIComponent(getRouterParam(event, 'slug')!)
  const section = await prisma.section.findUnique({ where: { slug }, include: { children: { orderBy: { sortOrder: 'asc' } } } })
  if (!section) throw createError({ statusCode: 404, message: 'Section not found' })
  // Breadcrumb from the root down to this section
  const trail = []
  let cur: typeof section | null = section
  const all = await prisma.section.findMany()
  while (cur) {
    trail.unshift({ slug: cur.slug, name: cur.name })
    cur = (all.find(s => s.id === cur!.parentId) as any) ?? null
  }
  return {
    id: section.id, slug: section.slug, name: section.name, description: section.description, icon: section.icon,
    banner: publicUrl(section.banner), seoTitle: section.seoTitle, seoDesc: section.seoDesc,
    children: section.children.map(c => ({ slug: c.slug, name: c.name, icon: c.icon })),
    trail,
  }
})
