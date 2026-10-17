/** The home page: the blocks chosen in Admin → Home page, each with its products or posts. */
export default defineEventHandler(async () => {
  const { home } = await getSettings()
  const published = { status: 'PUBLISHED' as const }
  const cards = (rows: ProductWithAll[]) => rows.map(toProductCard)
  const blocks = await Promise.all(home.blocks.filter(b => b.enabled).map(async (b) => {
    const take = b.limit ?? 8
    const base = { id: b.id, type: b.type, title: b.title ?? null }
    switch (b.type) {
      case 'featured':
        return { ...base, items: cards(await prisma.product.findMany({ where: { ...published, featured: true }, include: productInclude, take, orderBy: { publishedAt: 'desc' } })) }
      case 'newest':
        return { ...base, items: cards(await prisma.product.findMany({ where: published, include: productInclude, take, orderBy: { publishedAt: 'desc' } })) }
      case 'popular':
        return { ...base, items: cards(await prisma.product.findMany({ where: published, include: productInclude, take, orderBy: [{ salesCount: 'desc' }, { ratingAvg: 'desc' }] })) }
      case 'free':
        return { ...base, items: cards(await prisma.product.findMany({ where: { ...published, isFree: true }, include: productInclude, take, orderBy: { publishedAt: 'desc' } })) }
      case 'section': {
        const s = b.sectionId ? await prisma.section.findUnique({ where: { id: b.sectionId } }) : null
        if (!s) return null
        const items = await prisma.product.findMany({ where: { AND: [published, await productsInSection(s.id)] }, include: productInclude, take, orderBy: { publishedAt: 'desc' } })
        return { ...base, title: b.title ?? s.name, slug: s.slug, items: cards(items) }
      }
      case 'sections': {
        const sections = await prisma.section.findMany({ where: { showOnHome: true }, orderBy: { sortOrder: 'asc' } })
        // Count published products in each section including its sub-sections
        const counts = await Promise.all(sections.map(async s => prisma.product.count({ where: { AND: [published, await productsInSection(s.id)] } })))
        return { ...base, sections: sections.map((s, i) => ({ slug: s.slug, name: s.name, icon: s.icon, banner: publicUrl(s.banner), count: counts[i] })) }
      }
      case 'bundles': {
        const rows = await prisma.bundle.findMany({ where: { active: true }, include: bundleInclude, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }], take: Math.min(take, 6) })
        return { ...base, bundles: rows.map(toPublicBundle).filter(x => x.products.length >= 2) }
      }
      case 'blog': {
        const posts = await prisma.blogPost.findMany({ where: { status: 'published' }, orderBy: { publishedAt: 'desc' }, take: Math.min(take, 3) })
        return { ...base, posts: posts.map(toBlogCard) }
      }
      case 'banner':
        return { ...base, image: publicUrl(b.image), link: b.link ?? null }
      default:
        return base
    }
  }))
  return { blocks: blocks.filter(x => !!x) }
})
