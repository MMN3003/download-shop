export default defineEventHandler(async (event) => {
  const slug = decodeURIComponent(getRouterParam(event, 'slug')!)
  const p = await prisma.product.findUnique({ where: { slug }, include: productInclude })
  if (!p || p.status !== 'PUBLISHED') throw createError({ statusCode: 404, message: 'Product not found' })
  // Related: same sections, or same value in a section-linked field (e.g. same language)
  const linked = p.attributes.filter(v => v.valueText && p.productType.attributes.find(a => a.id === v.attributeId)?.linksSections)
  const related = await prisma.product.findMany({
    where: {
      status: 'PUBLISHED', id: { not: p.id },
      OR: [
        { sections: { some: { sectionId: { in: p.sections.map(s => s.sectionId) } } } },
        ...linked.map(v => ({ attributes: { some: { attributeId: v.attributeId, valueText: v.valueText } } })),
      ],
    },
    include: productInclude, take: 4, orderBy: { salesCount: 'desc' },
  })
  const session = await getUserSession(event)
  const userId = (session.user as any)?.id as string | undefined
  const owned = userId ? !!(await prisma.libraryItem.findFirst({ where: { userId, productId: p.id, revoked: false } })) : false
  const sample = p.files.find(f => f.kind === 'SAMPLE')
  return { product: { ...toPublicProduct(p), hasSample: !!sample }, related: related.map(toProductCard), owned }
})
