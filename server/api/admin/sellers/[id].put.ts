import { z } from 'zod'

const body = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(),
  trusted: z.boolean().optional(),
  reviewNote: z.string().nullish().transform(v => plainText(v, 1000) || null),
})

/** Approve, reject or suspend a seller, and decide whether they skip the review queue. */
export default defineEventHandler(async (event) => {
  const admin = await requireOwner(event)
  const data = await readValidatedBody(event, body.parse)
  const s = await prisma.seller.findUnique({ where: { id: getRouterParam(event, 'id')! }, include: { user: true } })
  if (!s) throw createError({ statusCode: 404, message: 'Not found' })
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.seller.update({ where: { id: s.id }, data })
    // Staff keep their own role; customers become sellers and back
    if (data.status === 'approved' && s.user.role === 'CUSTOMER') await tx.user.update({ where: { id: s.userId }, data: { role: 'SELLER' } })
    if (data.status && data.status !== 'approved' && s.user.role === 'SELLER') await tx.user.update({ where: { id: s.userId }, data: { role: 'CUSTOMER' } })
    // A suspended shop disappears from the store; buyers still keep their downloads
    if (data.status === 'suspended') await tx.product.updateMany({ where: { sellerId: s.id, status: 'PUBLISHED' }, data: { status: 'HIDDEN' } })
    return row
  })
  if (data.status && data.status !== s.status) {
    const text = {
      approved: 'حساب فروشندگی شما تأیید شد. از پنل فروشنده محصول اضافه کنید.',
      rejected: `درخواست فروشندگی شما رد شد.${data.reviewNote ? ` ${data.reviewNote}` : ''}`,
      suspended: `حساب فروشندگی شما معلق شد.${data.reviewNote ? ` ${data.reviewNote}` : ''}`,
      pending: 'درخواست فروشندگی شما دوباره در حال بررسی است.',
    }[data.status]
    await notifyUser(s.user, 'Seller account', text)
  }
  await logAdmin(admin.id, 'seller.update', s.id, data)
  return updated
})
