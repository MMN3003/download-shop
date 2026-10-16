import { z } from 'zod'

const body = z.object({ email: z.string().email(), password: z.string().min(1) })

/** Email + password login. Phone users log in with a code (otp/request + otp/verify). */
export default defineEventHandler(async (event) => {
  const { email, password } = await readValidatedBody(event, body.parse)
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, password))) {
    throw createError({ statusCode: 401, message: 'Wrong email or password' })
  }
  await startSession(event, user)
  return { ok: true, role: user.role }
})
