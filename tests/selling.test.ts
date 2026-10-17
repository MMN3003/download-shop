import { describe, expect, it } from 'vitest'
import { normalizePhone, parseLoginTarget, toLatinDigits } from '../shared/utils/contact'
import { makeDownloadToken, readDownloadToken } from '../server/utils/orders'

describe('login targets', () => {
  it('normalises Iranian mobile numbers in any common form', () => {
    for (const v of ['09121234567', '+989121234567', '00989121234567', '989121234567', '9121234567', '۰۹۱۲ ۱۲۳ ۴۵۶۷']) {
      expect(normalizePhone(v)).toBe('09121234567')
    }
    expect(normalizePhone('0212345678')).toBeNull()
  })
  it('tells emails from phones', () => {
    expect(parseLoginTarget(' Me@Example.com ')).toEqual({ kind: 'email', value: 'me@example.com' })
    expect(parseLoginTarget('۰۹۳۵۱۲۳۴۵۶۷')).toEqual({ kind: 'phone', value: '09351234567' })
    expect(parseLoginTarget('hello')).toBeNull()
  })
  it('converts Persian and Arabic digits', () => {
    expect(toLatinDigits('۱۲۳٤٥٦')).toBe('123456')
  })
})

describe('download links', () => {
  it('round-trips and rejects tampering', () => {
    const token = makeDownloadToken('lib1', 'file1')
    expect(readDownloadToken(token)).toEqual({ libraryItemId: 'lib1', fileId: 'file1' })
    const [body, sig] = token.split('.')
    const forged = `${Buffer.from(Buffer.from(body!, 'base64url').toString().replace('file1', 'file2')).toString('base64url')}.${sig}`
    expect(readDownloadToken(forged)).toBeNull()
    expect(readDownloadToken('garbage')).toBeNull()
  })
})

describe('plain text from users', async () => {
  const { plainText } = await import('../shared/utils/plain-text')
  it('removes tags, scripts and event handlers', () => {
    expect(plainText('<script>alert(1)</script>hi')).toBe('alert(1)hi')
    expect(plainText('<img src=x onerror=alert(1)>ok')).toBe('ok')
    expect(plainText('<a href="javascript:alert(1)">x</a>')).toBe('x')
    expect(plainText('a<!-- c -->b')).toBe('ab')
  })
  it('keeps Persian text, half-spaces and line breaks', () => {
    expect(plainText('می‌خواهم\r\nفلش‌کارت')).toBe('می‌خواهم\nفلش‌کارت')
  })
  it('drops direction overrides and caps length', () => {
    expect(plainText('abc‮def')).toBe('abcdef')
    expect(plainText('x'.repeat(50), 10)).toHaveLength(10)
  })
})
