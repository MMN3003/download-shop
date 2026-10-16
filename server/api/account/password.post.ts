import { z } from 'zod'

/**
 * Set or change the password. The current password is needed, unless the user
 * just logged in with a code (that is how "forgot password" works).
 */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const me = await requireUser(event)
  const { password, current } = await readValidatedBody(event, z.object({ password: z.string().min(8).max(200), current: z.string().optional() }).parse)
  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } })
  if (!user.email) throw createError({ statusCode: 422, message: 'Add an email to your account first' })
  const freshCode = typeof session.otpAt === 'number' && Date.now() - session.otpAt < 15 * 60_000
  if (user.passwordHash && !freshCode && !(current && await verifyPassword(user.passwordHash, current))) {
    throw createError({ statusCode: 401, message: 'Current password is wrong' })
  }
  await prisma.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(password) } })
  return { ok: true }
})
