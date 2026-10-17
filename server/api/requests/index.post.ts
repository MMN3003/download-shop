import { z } from 'zod'

const body = z.object({
  source: z.string().max(60),
  target: z.string().max(60),
  subject: z.string().transform(v => plainText(v, 200)).pipe(z.string().min(3, 'Write the subject')),
  details: z.string().optional().transform(v => plainText(v, 4000) || null),
})

/** A buyer asks for a product (e.g. a deck from Arabic to Persian about medicine). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const data = await readValidatedBody(event, body.parse)
  const { enabled, options } = await requestOptions()
  if (!enabled) throw createError({ statusCode: 403, message: 'Requests are closed for now' })
  const values = new Set(options.map(o => o.value))
  if (!values.has(data.source) || !values.has(data.target)) throw createError({ statusCode: 422, message: 'Choose from the list' })
  const { requests } = await getSettings()
  const today = await prisma.productRequest.count({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 86400_000) } } })
  if (today >= requests.perDay) throw createError({ statusCode: 429, message: 'You have sent the most requests allowed for today' })
  const r = await prisma.productRequest.create({ data: { ...data, userId: user.id } })
  return { number: r.number }
})
