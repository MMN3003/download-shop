import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { agreementScope, sellerStatus, shebaSchema } from '../server/utils/marketplace'

const seller = (trusted: boolean) => ({ user: { id: 'u', role: 'SELLER' }, staff: false, seller: { trusted } as any })

describe('seller product status', () => {
  it('sends an untrusted seller\'s publish to review', () => {
    expect(sellerStatus(seller(false), 'PUBLISHED')).toBe('IN_REVIEW')
    expect(sellerStatus(seller(false), 'DRAFT')).toBe('DRAFT')
    expect(sellerStatus(seller(false), 'HIDDEN')).toBe('HIDDEN')
  })
  it('lets trusted sellers and staff publish', () => {
    expect(sellerStatus(seller(true), 'PUBLISHED')).toBe('PUBLISHED')
    expect(sellerStatus({ user: { id: 'u', role: 'EDITOR' }, staff: true, seller: null }, 'PUBLISHED')).toBe('PUBLISHED')
  })
})

describe('commission agreements', () => {
  it('keeps only the id that matches the scope', () => {
    expect(agreementScope.parse({ scope: 'seller', sectionId: 's', productId: 'p' })).toEqual({ scope: 'seller', sectionId: null, productId: null })
    expect(agreementScope.parse({ scope: 'product', sectionId: 's', productId: 'p' })).toEqual({ scope: 'product', sectionId: null, productId: 'p' })
    expect(() => agreementScope.parse({ scope: 'section' })).toThrow()
  })
  it('normalises Sheba numbers', () => {
    const s = shebaSchema(z)
    expect(s.parse('ir 12-0000 0000 0000 0000 0000 00')).toBe('IR120000000000000000000000')
    expect(s.parse('IR۱۲۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰')).toBe('IR120000000000000000000000')
    expect(() => s.parse('IR12')).toThrow()
  })
})
