import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SERVER_ERRORS, serverErrorKey } from '../shared/utils/server-errors'

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f)
  return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : []
})
const locales = { en: JSON.parse(readFileSync('i18n/locales/en.json', 'utf8')), fa: JSON.parse(readFileSync('i18n/locales/fa.json', 'utf8')) }

// Every fixed English message the server can send: createError({ message }) and zod messages
const lit = String.raw`'((?:[^'\\]|\\.)*)'`
const found = new Set<string>()
for (const f of files('server')) {
  const s = readFileSync(f, 'utf8')
  for (const m of s.matchAll(new RegExp(String.raw`message:\s*` + lit, 'g'))) found.add(m[1]!.replace(/\\'/g, '\''))
  for (const m of s.matchAll(new RegExp(String.raw`\.(?:regex|refine|min|max|length)\((?:[^()]|\([^()]*\))*?,\s*` + lit + String.raw`\s*\)`, 'g'))) found.add(m[1]!.replace(/\\'/g, '\''))
}

describe('server error messages', () => {
  it('finds the messages in the server code', () => {
    expect(found.size).toBeGreaterThan(80)
  })
  it.each([...found])('"%s" has a translation key', (msg) => {
    expect(serverErrorKey(msg)).not.toBeNull()
  })
  it('matches messages that carry a value', () => {
    expect(serverErrorKey('The smallest payout is 500000')).toEqual({ key: 'minPayout', params: { amount: '500000' } })
    expect(serverErrorKey('3 products use this type; move or delete them first')?.params).toEqual({ n: '3' })
    expect(serverErrorKey('Required fields missing: Level, Language')?.key).toBe('requiredFields')
  })
  it('has every key in English and Persian', () => {
    for (const key of [...Object.values(SERVER_ERRORS), 'typeInUse', 'imageTypes', 'minPayout', 'zarinpalRefused', 'bundlePrice', 'fileTypes', 'requiredFields', 'checkForm', 'generic']) {
      expect(locales.en.serverErrors[key], key).toBeTruthy()
      expect(locales.fa.serverErrors[key], key).toBeTruthy()
    }
  })
})
