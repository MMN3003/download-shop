const faDigits = '۰۱۲۳۴۵۶۷۸۹'
const arDigits = '٠١٢٣٤٥٦٧٨٩'

/** Persian/Arabic digits → ASCII digits. */
export function toLatinDigits(s: string): string {
  return s.replace(/[۰-۹]/g, d => String(faDigits.indexOf(d))).replace(/[٠-٩]/g, d => String(arDigits.indexOf(d)))
}

/** Iranian mobile in the form 09xxxxxxxxx, or null. Accepts +98, 0098, 98 and 9xx forms. */
export function normalizePhone(input: string): string | null {
  let s = toLatinDigits(input).replace(/[\s\-()]/g, '')
  if (s.startsWith('+98')) s = `0${s.slice(3)}`
  else if (s.startsWith('0098')) s = `0${s.slice(4)}`
  else if (s.startsWith('98') && s.length === 12) s = `0${s.slice(2)}`
  else if (s.startsWith('9') && s.length === 10) s = `0${s}`
  return /^09\d{9}$/.test(s) ? s : null
}

export function normalizeEmail(input: string): string | null {
  const s = input.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null
}

/** A login target: phone or email, normalised. */
export function parseLoginTarget(input: string): { kind: 'phone' | 'email', value: string } | null {
  const email = input.includes('@') ? normalizeEmail(input) : null
  if (email) return { kind: 'email', value: email }
  const phone = normalizePhone(input)
  return phone ? { kind: 'phone', value: phone } : null
}
