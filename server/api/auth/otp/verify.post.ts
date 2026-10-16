import { z } from 'zod'

/**
 * Check a login code. Signed out: log in, creating the account on first use.
 * Signed in: add this phone/email to the current account (account linking).
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, z.object({ target: z.string(), code: z.string().regex(/^[0-9۰-۹]{6}$/) }).parse)
  const parsed = parseLoginTarget(body.target)
  if (!parsed || !(await verifyOtp(parsed.value, toLatinDigits(body.code)))) {
    throw createError({ statusCode: 401, message: 'The code is wrong or has expired' })
  }
  const field = parsed.kind
  const owner = await prisma.user.findUnique({ where: field === 'phone' ? { phone: parsed.value } : { email: parsed.value } })
  const session = await getUserSession(event)
  const current = session.user as { id: string } | undefined

  if (current) {
    if (owner && owner.id !== current.id) throw createError({ statusCode: 409, message: 'This is already used by another account' })
    const user = await prisma.user.update({ where: { id: current.id }, data: { [field]: parsed.value } })
    return { ok: true, linked: field, role: user.role }
  }

  const user = owner ?? await prisma.user.create({ data: { [field]: parsed.value } })
  await startSession(event, user, { otpAt: Date.now() })
  return { ok: true, created: !owner, role: user.role }
})
