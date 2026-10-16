import type { Prisma } from '@prisma/client'

/**
 * Catalog listing with search, filters and sorting.
 * Query: q, section, type, free=1, minPrice, maxPrice, sort (new|popular|rating|price_asc|price_desc),
 * page, and attribute filters as attr_<key>=v1,v2 (select), attr_<key>=1 (boolean),
 * attr_<key>_min / attr_<key>_max (number).
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page) || 1)
  const perPage = Math.min(48, Number(q.perPage) || 24)
  const and: Prisma.ProductWhereInput[] = [{ status: 'PUBLISHED' }]

  if (q.q) {
    for (const word of normalizeSearch(q.q).split(' ').filter(Boolean)) {
      and.push({ searchText: { contains: word, mode: 'insensitive' } })
    }
  }
  if (q.section) {
    const s = await prisma.section.findUnique({ where: { slug: q.section } })
    if (!s) return { items: [], total: 0, page, perPage }
    and.push(await productsInSection(s.id))
  }
  let typeId: string | undefined
  if (q.type) {
    const t = await prisma.productType.findUnique({ where: { key: q.type } })
    typeId = t?.id ?? 'none'
    and.push({ productTypeId: typeId })
  }
  if (q.free === '1') and.push({ isFree: true })
  if (q.minPrice) and.push({ price: { gte: Number(q.minPrice) } })
  if (q.maxPrice) and.push({ price: { lte: Number(q.maxPrice) } })

  const attrKeys = [...new Set(Object.keys(q).filter(k => k.startsWith('attr_')).map(k => k.slice(5).replace(/_(min|max)$/, '')))]
  if (attrKeys.length) {
    const defs = await prisma.attributeDefinition.findMany({ where: { key: { in: attrKeys }, filterable: true, ...(typeId ? { productTypeId: typeId } : {}) } })
    for (const key of attrKeys) {
      const ids = defs.filter(d => d.key === key).map(d => d.id)
      if (!ids.length) continue
      const kind = defs.find(d => d.key === key)!.kind
      if (kind === 'BOOLEAN' && q[`attr_${key}`]) {
        and.push({ attributes: { some: { attributeId: { in: ids }, valueBool: q[`attr_${key}`] === '1' } } })
      }
      else if (kind === 'NUMBER') {
        const range: Prisma.FloatNullableFilter = {}
        if (q[`attr_${key}_min`]) range.gte = Number(q[`attr_${key}_min`])
        if (q[`attr_${key}_max`]) range.lte = Number(q[`attr_${key}_max`])
        if (Object.keys(range).length) and.push({ attributes: { some: { attributeId: { in: ids }, valueNumber: range } } })
      }
      else if (q[`attr_${key}`]) {
        const values = q[`attr_${key}`]!.split(',').filter(Boolean)
        and.push({ attributes: { some: { attributeId: { in: ids }, valueText: { in: values } } } })
      }
    }
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] = {
    popular: [{ salesCount: 'desc' as const }],
    rating: [{ ratingAvg: 'desc' as const }, { ratingCount: 'desc' as const }],
    price_asc: [{ price: 'asc' as const }],
    price_desc: [{ price: 'desc' as const }],
    new: [{ publishedAt: 'desc' as const }],
  }[q.sort || 'new'] ?? [{ publishedAt: 'desc' }]

  const where = { AND: and }
  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, include: productInclude, orderBy, skip: (page - 1) * perPage, take: perPage }),
    prisma.product.count({ where }),
  ])
  return { items: items.map(toProductCard), total, page, perPage }
})
