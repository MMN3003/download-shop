export default defineEventHandler(async () => {
  const items = await prisma.bundle.findMany({ where: { active: true }, include: bundleInclude, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] })
  return items.map(toPublicBundle).filter(b => b.products.length >= 2)
})
