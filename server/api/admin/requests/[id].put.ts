import { z } from 'zod'

const body = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE', 'DECLINED']),
  productSlug: z.string().trim().max(200).nullish(),
  /** Optional answer sent with the change */
  message: z.string().optional().transform(v => plainText(v, 4000)),
})

/** Answer a request and/or change its status; the buyer is notified. */
export default defineEventHandler(async (event) => {
  const user = await requireSupport(event)
  const id = getRouterParam(event, 'id')!
  const data = await readValidatedBody(event, body.parse)
  const before = await prisma.productRequest.findUniqueOrThrow({ where: { id }, include: { user: true } })
  let productId: string | null = before.productId
  if (data.productSlug !== undefined) {
    productId = null
    if (data.productSlug) {
      const p = await prisma.product.findUnique({ where: { slug: data.productSlug } })
      if (!p) throw createError({ statusCode: 422, message: 'No product with this slug' })
      productId = p.id
    }
  }
  const changed = before.status !== data.status || before.productId !== productId
  if (!changed && !data.message) return { ok: true }
  await prisma.$transaction([
    prisma.productRequest.update({ where: { id }, data: { status: data.status, productId, unreadUser: true, unreadStaff: false } }),
    ...(data.message ? [prisma.requestMessage.create({ data: { requestId: id, authorId: user.id, fromStaff: true, body: data.message } })] : []),
  ])
  await notifyUser(before.user, `Request #${before.number} updated`, `درخواست #${before.number} شما پاسخ یا به‌روزرسانی دارد.\nYour request #${before.number} has an update.`)
  await logAdmin(user.id, 'request.update', id, { status: data.status })
  return { ok: true }
})
