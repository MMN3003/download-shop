import { z } from 'zod'

const body = z.object({
  displayName: z.string().transform(v => plainText(v, 80)).pipe(z.string().min(2)),
  bio: z.string().nullish().transform(v => plainText(v, 1000) || null),
  avatar: z.string().nullish(),
  sheba: z.union([z.literal(''), shebaSchema(z)]).nullish().transform(v => v || null),
  accountHolder: z.string().nullish().transform(v => plainText(v, 100) || null),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const data = await readValidatedBody(event, body.parse)
  const seller = await prisma.seller.findUnique({ where: { userId: user.id } })
  if (!seller) throw createError({ statusCode: 404, message: 'Not a seller' })
  // Only images this store uploaded can be used as an avatar
  if (data.avatar && !data.avatar.startsWith('images/')) throw createError({ statusCode: 422, message: 'Upload the image first' })
  const s = await prisma.seller.update({ where: { id: seller.id }, data })
  return { ...s, avatarUrl: publicUrl(s.avatar) }
})
