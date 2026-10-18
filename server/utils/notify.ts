import { createTransport, type Transporter } from 'nodemailer'

/**
 * Outgoing SMS and email. Providers are picked by env vars so no secret is
 * stored in the database. Without configuration, messages are printed to the
 * server log (handy in development).
 *
 * SMS_PROVIDER=kavenegar  SMS_API_KEY=...  SMS_SENDER=... (optional)  SMS_OTP_TEMPLATE=... (optional, Kavenegar "verify" template)
 * SMTP_URL=smtps://user:pass@smtp.example.com:465  MAIL_FROM="Store <no-reply@example.com>"
 */

export async function sendSms(to: string, text: string, otp?: string) {
  const provider = process.env.SMS_PROVIDER || 'console'
  if (provider === 'kavenegar') {
    const key = process.env.SMS_API_KEY
    if (!key) throw new Error('SMS_API_KEY is not set')
    const base = `https://api.kavenegar.com/v1/${key}`
    const template = process.env.SMS_OTP_TEMPLATE
    const url = otp && template
      ? `${base}/verify/lookup.json?${new URLSearchParams({ receptor: to, token: otp, template })}`
      : `${base}/sms/send.json?${new URLSearchParams({ receptor: to, message: text, ...(process.env.SMS_SENDER ? { sender: process.env.SMS_SENDER } : {}) })}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`SMS failed (${res.status})`)
    return
  }
  // No provider: fine in development (the code is logged), but in production nobody would get it
  if (process.env.NODE_ENV === 'production') throw createError({ statusCode: 503, message: 'SMS is not set up yet' })
  console.info(`[sms → ${to}] ${otp ? text.replace(otp, '******') : text}`)
}

let mailer: Transporter | null = null
export async function sendEmail(to: string, subject: string, text: string) {
  if (!process.env.SMTP_URL) {
    if (process.env.NODE_ENV === 'production') throw createError({ statusCode: 503, message: 'Email is not set up yet' })
    console.info(`[email → ${to}] ${subject}\n${text}`)
    return
  }
  mailer ??= createTransport(process.env.SMTP_URL)
  await mailer.sendMail({ from: process.env.MAIL_FROM || 'no-reply@localhost', to, subject, text })
}

/** Message a user on every channel they have. Failures are logged, never thrown. */
export async function notifyUser(user: { phone?: string | null, email?: string | null }, subject: string, text: string) {
  await Promise.all([
    user.phone ? sendSms(user.phone, text).catch(e => console.error('sms', e)) : null,
    user.email ? sendEmail(user.email, subject, text).catch(e => console.error('email', e)) : null,
  ])
}
