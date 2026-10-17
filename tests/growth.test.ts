import { describe, expect, it } from 'vitest'
import { couponAmount, couponProblem, normalizeCode, splitByWeight } from '../server/utils/discounts'

describe('splitByWeight', () => {
  it('always adds up to the amount', () => {
    for (const [amount, weights] of [[100, [1, 1, 1]], [99_999, [30_000, 50_000, 70_001]], [7, [5, 5]], [0, [3, 4]]] as const) {
      const parts = splitByWeight(amount, [...weights])
      expect(parts.reduce((a, b) => a + b, 0)).toBe(amount)
      expect(parts.every(p => p >= 0)).toBe(true)
    }
  })
  it('splits in proportion to the weights', () => {
    expect(splitByWeight(45_000, [10_000, 20_000, 60_000])).toEqual([5_000, 10_000, 30_000])
    // Rounding leftovers go to the largest line
    expect(splitByWeight(50, [100, 300])).toEqual([12, 38])
  })
  it('puts everything on the first line when all weights are zero', () => {
    expect(splitByWeight(10, [0, 0])).toEqual([10, 0])
  })
})

describe('coupons', () => {
  const base = { active: true, startsAt: null, endsAt: null, maxUses: null, usedCount: 0, minTotal: 0 }
  const now = new Date('2026-10-17T12:00:00Z')
  it('accepts a live code', () => {
    expect(couponProblem(base, 1000, now)).toBeNull()
  })
  it('says why a code cannot be used', () => {
    expect(couponProblem({ ...base, active: false }, 1000, now)).toBe('invalid')
    expect(couponProblem({ ...base, startsAt: new Date('2026-10-18') }, 1000, now)).toBe('invalid')
    expect(couponProblem({ ...base, endsAt: new Date('2026-10-17T11:00:00Z') }, 1000, now)).toBe('expired')
    expect(couponProblem({ ...base, maxUses: 5, usedCount: 5 }, 1000, now)).toBe('usedUp')
    expect(couponProblem({ ...base, minTotal: 2000 }, 1000, now)).toBe('minTotal')
  })
  it('never takes off more than the eligible amount', () => {
    expect(couponAmount({ kind: 'PERCENT', value: 20 }, 50_000)).toBe(10_000)
    expect(couponAmount({ kind: 'PERCENT', value: 150 }, 50_000)).toBe(50_000)
    expect(couponAmount({ kind: 'AMOUNT', value: 70_000 }, 50_000)).toBe(50_000)
    expect(couponAmount({ kind: 'AMOUNT', value: 5_000 }, 50_000)).toBe(5_000)
  })
  it('normalises codes typed with Persian digits, spaces or lower case', () => {
    expect(normalizeCode(' yalda ۱۴۰۵ ')).toBe('YALDA1405')
  })
})
