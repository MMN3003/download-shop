import { z } from 'zod'

export const couponInput = z.object({
  code: z.string().transform(normalizeCode).pipe(z.string().regex(/^[A-Z0-9_-]{3,40}$/, 'Use 3–40 letters, digits, - or _')),
  kind: z.enum(['PERCENT', 'AMOUNT']),
  value: z.number().int().positive(),
  minTotal: z.number().int().min(0).default(0),
  maxUses: z.number().int().positive().nullish(),
  perUser: z.number().int().min(1).default(1),
  startsAt: z.coerce.date().nullish(),
  endsAt: z.coerce.date().nullish(),
  sectionId: z.string().nullish(),
  productId: z.string().nullish(),
  active: z.boolean().default(true),
  note: z.string().nullish().transform(v => plainText(v, 500) || null),
}).refine(v => v.kind !== 'PERCENT' || v.value <= 100, { message: 'A percentage can be at most 100', path: ['value'] })
  .refine(v => !v.startsAt || !v.endsAt || v.endsAt > v.startsAt, { message: 'The end must be after the start', path: ['endsAt'] })

export async function saveCoupon(id: string | null, data: z.infer<typeof couponInput>) {
  const clash = await prisma.coupon.findFirst({ where: { code: data.code, ...(id ? { id: { not: id } } : {}) } })
  if (clash) throw createError({ statusCode: 409, message: 'This code already exists' })
  return id ? prisma.coupon.update({ where: { id }, data }) : prisma.coupon.create({ data })
}
