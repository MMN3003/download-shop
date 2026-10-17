import type { Prisma } from '@prisma/client'

export default defineEventHandler(async (event) => {
  await requireSupport(event)
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page) || 1)
  const perPage = 30
  const where: Prisma.ProductRequestWhereInput = {}
  if (q.status) where.status = q.status as any
  if (q.q) {
    const term = toLatinDigits(q.q.trim())
    where.OR = [
      ...(/^\d{1,8}$/.test(term) ? [{ number: Number(term) }] : []),
      { subject: { contains: term, mode: 'insensitive' } },
      { user: { phone: { contains: term } } },
      { user: { email: { contains: term, mode: 'insensitive' } } },
    ]
  }
  const [items, total, options] = await Promise.all([
    prisma.productRequest.findMany({ where, include: { user: { select: { name: true, phone: true, email: true } }, _count: { select: { messages: true } } }, orderBy: [{ unreadStaff: 'desc' }, { updatedAt: 'desc' }], skip: (page - 1) * perPage, take: perPage }),
    prisma.productRequest.count({ where }),
    requestOptions(),
  ])
  return { items, total, page, perPage, options: options.options }
})
