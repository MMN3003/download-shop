import type { Coupon } from '@prisma/client'
import { toLatinDigits } from '../../shared/utils/contact'

/** Split `amount` over `weights` in proportion, so the parts always add up exactly. */
export function splitByWeight(amount: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (!sum) return weights.map((_, i) => (i === 0 ? amount : 0))
  const parts = weights.map(w => Math.floor(amount * w / sum))
  let rest = amount - parts.reduce((a, b) => a + b, 0)
  // Give the rounding leftovers to the largest lines first
  const order = weights.map((w, i) => [w, i] as const).sort((a, b) => b[0] - a[0])
  for (let k = 0; rest > 0; k = (k + 1) % order.length, rest--) parts[order[k]![1]]! += 1
  return parts
}

export type CouponError = 'invalid' | 'expired' | 'usedUp' | 'minTotal' | 'usedByMe' | 'notApplicable'

/** Why a coupon can't be used now, or null when it can (per-user limits are checked separately). */
export function couponProblem(c: Pick<Coupon, 'active' | 'startsAt' | 'endsAt' | 'maxUses' | 'usedCount' | 'minTotal'>, subtotal: number, now = new Date()): CouponError | null {
  if (!c.active || (c.startsAt && c.startsAt > now)) return 'invalid'
  if (c.endsAt && c.endsAt <= now) return 'expired'
  if (c.maxUses != null && c.usedCount >= c.maxUses) return 'usedUp'
  if (subtotal < c.minTotal) return 'minTotal'
  return null
}

export function couponAmount(c: Pick<Coupon, 'kind' | 'value'>, eligible: number) {
  return Math.min(eligible, c.kind === 'PERCENT' ? Math.round(eligible * Math.min(100, c.value) / 100) : c.value)
}

export const normalizeCode = (code: string) => toLatinDigits(code).trim().toUpperCase().replace(/\s+/g, '')
