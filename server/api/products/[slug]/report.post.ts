import { z } from 'zod'

const body = z.object({
  reason: z.enum(['copyright', 'wrong', 'offensive', 'other']),
  details: z.string().transform(v => plainText(v, 2000)).pipe(z.string().min(5, 'Describe the problem')),
  contact: z.string().optional().transform(v => plainText(v, 120) || null),
})

const recent = new Map<string, number[]>()

/** Anyone can report a product (copyright holders may not have an account). */
export default defineEventHandler(async (event) => {
  const data = await readValidatedBody(event, body.parse)
  const session = await getUserSession(event)
  const userId = (session.user as { id: string } | undefined)?.id ?? null
  if (!userId && !data.contact) throw createError({ statusCode: 422, message: 'Leave a phone number or email so we can reply' })
  // At most 5 reports a day per account or address
  const who = userId ?? getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const day = Date.now() - 86400_000
  const times = (recent.get(who) ?? []).filter(t => t > day)
  if (times.length >= 5) throw createError({ statusCode: 429, message: 'Too many reports today' })
  const p = await prisma.product.findFirst({ where: { slug: getRouterParam(event, 'slug')!, status: 'PUBLISHED' } })
  if (!p) throw createError({ statusCode: 404, message: 'Not found' })
  recent.set(who, [...times, Date.now()])
  await prisma.contentReport.create({ data: { ...data, productId: p.id, userId } })
  return { ok: true }
})
