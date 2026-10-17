import { z } from 'zod'

const body = z.object({ status: z.enum(['open', 'resolved', 'dismissed']), hideProduct: z.boolean().default(false) })

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ADMIN_ROLES)
  const { status, hideProduct } = await readValidatedBody(event, body.parse)
  const r = await prisma.contentReport.update({ where: { id: getRouterParam(event, 'id')! }, data: { status } })
  if (hideProduct) {
    if (user.role === 'SUPPORT') throw createError({ statusCode: 403, message: 'Not allowed' })
    await prisma.product.update({ where: { id: r.productId }, data: { status: 'HIDDEN' } })
  }
  await logAdmin(user.id, 'report.update', r.id, { status, hideProduct })
  return r
})
