export interface PriceFields {
  price: number
  salePrice?: number | null
  saleStartsAt?: string | Date | null
  saleEndsAt?: string | Date | null
  isFree?: boolean
}

/** The price a buyer pays right now, taking free flag and sale window into account. */
export function effectivePrice(p: PriceFields, now = new Date()): number {
  if (p.isFree) return 0
  if (p.salePrice != null && p.salePrice < p.price) {
    const starts = p.saleStartsAt ? new Date(p.saleStartsAt) : null
    const ends = p.saleEndsAt ? new Date(p.saleEndsAt) : null
    if ((!starts || starts <= now) && (!ends || ends > now)) return p.salePrice
  }
  return p.price
}

export function isOnSale(p: PriceFields, now = new Date()): boolean {
  return !p.isFree && effectivePrice(p, now) < p.price
}
