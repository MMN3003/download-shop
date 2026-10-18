import { describe, expect, it } from 'vitest'
import fa from '../../i18n/locales/fa.json'
import { serverErrorKey } from '../../shared/utils/server-errors'
import { client, loginAdmin, loginWithCode, newEmail, newPhone, requestCode } from './helpers'

describe('sign up and log in', () => {
  it('a guest can price a cart without a session (no 500)', async () => {
    const r = await client()('/api/cart/quote', { method: 'POST', body: { ids: [] } })
    expect(r.status).toBe(200)
  })

  it('signs up with a mobile number, then logs in again with a new code', async () => {
    const c = client()
    const phone = newPhone()
    const first = await loginWithCode(c, phone)
    expect(first).toMatchObject({ ok: true, created: true, role: 'CUSTOMER' })
    const me = (await c('/api/account')).data
    expect(me.phone).toBe(phone)

    await c('/api/auth/logout', { method: 'POST' })
    expect((await c('/api/account')).status).toBe(401)
  })

  it('accepts the number in Persian digits and +98 form', async () => {
    const c = client()
    const phone = newPhone()
    const code = await requestCode(c, `+98${phone.slice(1)}`)
    const persian = code.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!)
    const r = await c('/api/auth/otp/verify', { method: 'POST', body: { target: phone.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!), code: persian } })
    expect(r.status).toBe(200)
    expect((await c('/api/account')).data.phone).toBe(phone)
  })

  it('signs up with email, sets a password, and logs in with it', async () => {
    const c = client()
    const email = newEmail('pw')
    await loginWithCode(c, email)
    // Right after a code login no current password is needed
    expect((await c('/api/account/password', { method: 'POST', body: { password: 'short' } })).status).toBe(400)
    expect((await c('/api/account/password', { method: 'POST', body: { password: 'long enough 123' } })).status).toBe(200)

    const other = client()
    const wrong = await other('/api/auth/login', { method: 'POST', body: { email, password: 'nope nope' } })
    expect(wrong.status).toBe(401)
    expect((await other('/api/auth/login', { method: 'POST', body: { email: email.toUpperCase(), password: 'long enough 123' } })).status).toBe(200)
    expect((await other('/api/account')).data.email).toBe(email)
  })

  it('links an email to a phone account, and refuses one that belongs to someone else', async () => {
    const c = client()
    await loginWithCode(c, newPhone())
    const email = newEmail('link')
    const r = await c('/api/auth/otp/verify', { method: 'POST', body: { target: email, code: await requestCode(c, email) } })
    expect(r.data).toMatchObject({ ok: true, linked: 'email' })
    expect((await c('/api/account')).data.email).toBe(email)

    // The seeded owner's email is someone else's
    const owner = process.env.SEED_ADMIN_EMAIL || 'admin@example.com'
    const taken = await c('/api/auth/otp/verify', { method: 'POST', body: { target: owner, code: await requestCode(c, owner) } })
    expect(taken.status).toBe(409)
  })

  it('rejects a wrong code and a reused code', async () => {
    const c = client()
    const phone = newPhone()
    const code = await requestCode(c, phone)
    const wrong = String((Number(code) + 1) % 1_000_000).padStart(6, '0')
    expect((await c('/api/auth/otp/verify', { method: 'POST', body: { target: phone, code: wrong } })).status).toBe(401)
    expect((await c('/api/auth/otp/verify', { method: 'POST', body: { target: phone, code } })).status).toBe(200)
    expect((await client()('/api/auth/otp/verify', { method: 'POST', body: { target: phone, code } })).status).toBe(401)
  })

  it('asks to wait a minute before a new code, in the visitor\'s language', async () => {
    const c = client()
    const phone = newPhone()
    await requestCode(c, phone)
    const again = await c('/api/auth/otp/request', { method: 'POST', body: { target: phone } })
    expect(again.status).toBe(429)
    expect(again.data.data.retryAfter).toBeGreaterThan(0)
    // The server answers in English; the app shows the matching translation
    const known = serverErrorKey(again.data.message)
    expect(known?.key).toBeTruthy()
    expect((fa as any).serverErrors[known!.key]).toBe('لطفاً یک دقیقه صبر کنید و بعد کد تازه بخواهید')
  })

  it('refuses a target that is neither a mobile number nor an email', async () => {
    const r = await client()('/api/auth/otp/request', { method: 'POST', body: { target: '<script>1</script>' } })
    expect(r.status).toBe(422)
  })

  it('admin logs in with a password and reaches the admin API; customers do not', async () => {
    const admin = client()
    await loginAdmin(admin)
    expect((await admin('/api/admin/stats')).status).toBe(200)

    const customer = client()
    await loginWithCode(customer, newPhone())
    for (const path of ['/api/admin/stats', '/api/admin/orders', '/api/admin/settings', '/api/admin/products']) {
      expect((await customer(path)).status, path).toBe(403)
    }
    expect((await client()('/api/admin/stats')).status).toBe(401)
  })
})
