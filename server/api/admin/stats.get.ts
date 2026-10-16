export default defineEventHandler(async (event) => {
  await requireRole(event, ADMIN_ROLES)
  const [products, published, inReview, sections, types, users, recent] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: 'PUBLISHED' } }),
    prisma.product.count({ where: { status: 'IN_REVIEW' } }),
    prisma.section.count(),
    prisma.productType.count(),
    prisma.user.count(),
    prisma.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { name: true, email: true } } } }),
  ])
  return { products, published, inReview, sections, types, users, recent }
})
