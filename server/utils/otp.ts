import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { prisma } from './prisma'

const TTL_MS = 2 * 60_000
const RESEND_MS = 60_000
const MAX_PER_HOUR = 5
const MAX_ATTEMPTS = 5

function hashCode(target: string, code: string) {
  return createHmac('sha256', process.env.NUXT_SESSION_PASSWORD || 'dev').update(`${target}:${code}`).digest('hex')
}

/** Create and send a 6-digit code. Rate-limited per target. */
export async function issueOtp(target: { kind: 'phone' | 'email', value: string }, ip?: string) {
  const recent = await prisma.otpCode.findMany({ where: { target: target.value, createdAt: { gt: new Date(Date.now() - 3600_000) } }, orderBy: { createdAt: 'desc' } })
  if (recent[0] && Date.now() - recent[0].createdAt.getTime() < RESEND_MS) {
    throw createError({ statusCode: 429, message: 'Please wait a minute before asking for a new code', data: { retryAfter: Math.ceil((RESEND_MS - (Date.now() - recent[0].createdAt.getTime())) / 1000) } })
  }
  if (recent.length >= MAX_PER_HOUR) throw createError({ statusCode: 429, message: 'Too many codes requested. Try again later.' })
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await prisma.otpCode.create({ data: { target: target.value, codeHash: hashCode(target.value, code), expiresAt: new Date(Date.now() + TTL_MS), ip } })
  const { storeName } = await getSettings()
  const name = storeName.fa || storeName.en
  if (target.kind === 'phone') await sendSms(target.value, `${name}\nکد ورود: ${code}`, code)
  else await sendEmail(target.value, `${name}: ${code}`, `Your login code: ${code}\nکد ورود شما: ${code}\n\nThe code is valid for 2 minutes.`)
  return { expiresIn: TTL_MS / 1000, resendIn: RESEND_MS / 1000 }
}

/** Check a code; consumes it on success. */
export async function verifyOtp(target: string, code: string): Promise<boolean> {
  const otp = await prisma.otpCode.findFirst({ where: { target, consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } })
  if (!otp || otp.attempts >= MAX_ATTEMPTS) return false
  const a = Buffer.from(otp.codeHash, 'hex')
  const b = Buffer.from(hashCode(target, code.trim()), 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } })
    return false
  }
  // Conditional update so the same code can't be used twice in parallel
  const { count } = await prisma.otpCode.updateMany({ where: { id: otp.id, consumedAt: null }, data: { consumedAt: new Date() } })
  return count === 1
}
