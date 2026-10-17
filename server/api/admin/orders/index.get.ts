import type { Prisma } from '@prisma/client'

/** Orders list. Query: status, q (order number, phone, email or name), page. */
export default defineEventHandler(async (event) => {
  await requireSupport(event)
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page) || 1)
  const perPage = 30
  const where: Prisma.OrderWhereInput = {}
  if (q.status) where.status = q.status as any
  if (q.q) {
    const term = toLatinDigits(q.q.trim())
    where.OR = [
      ...(/^\d+$/.test(term) && term.length < 9 ? [{ number: Number(term) }] : []),
      { user: { phone: { contains: term } } },
      { user: { email: { contains: term, mode: 'insensitive' } } },
      { user: { name: { contains: term, mode: 'insensitive' } } },
      { payments: { some: { reference: { contains: term } } } },
    ]
  }
  const [items, total] = await Promise.all([
    prisma.order.findMany({ where, include: { user: { select: { name: true, phone: true, email: true } }, items: { select: { title: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * perPage, take: perPage }),
    prisma.order.count({ where }),
  ])
  return { items, total, page, perPage }
})
