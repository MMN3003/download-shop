import { z } from 'zod'

/** Send a login code to a phone (SMS) or email. */
export default defineEventHandler(async (event) => {
  const { target } = await readValidatedBody(event, z.object({ target: z.string().min(3).max(200) }).parse)
  const parsed = parseLoginTarget(target)
  if (!parsed) throw createError({ statusCode: 422, message: 'Enter a valid mobile number or email' })
  const result = await issueOtp(parsed, getRequestIP(event, { xForwardedFor: true }))
  return { ...result, target: parsed.value, kind: parsed.kind }
})
