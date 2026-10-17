/** One line of an order: what the buyer pays for one product, and what was taken off. */
export type OrderLine = { productId: string, sellerId: string | null, title: unknown, unitPrice: number, discount: number, bundleId: string | null }

export const bundleInclude = { items: { orderBy: { position: 'asc' }, include: { product: { include: productInclude } } } } as const

/**
 * Price a cart: plain product ids and bundles ("b:<id>"), with what the buyer
 * already owns left out and an optional coupon. Returns what the cart page
 * shows and the lines an order is made of.
 */
export async function priceCart(ids: string[], userId?: string, couponCode?: string | null) {
  const bundleIds = [...new Set(ids.filter(i => i.startsWith('b:')).map(i => i.slice(2)))]
  const productIds = [...new Set(ids.filter(i => !i.startsWith('b:')))]
  const [products, bundles] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds }, status: 'PUBLISHED' }, include: productInclude }),
    prisma.bundle.findMany({ where: { id: { in: bundleIds }, active: true }, include: bundleInclude }),
  ])
  const allIds = [...products.map(p => p.id), ...bundles.flatMap(b => b.items.map(i => i.productId))]
  const owned = userId
    ? new Set((await prisma.libraryItem.findMany({ where: { userId, productId: { in: allIds }, revoked: false } })).map(x => x.productId))
    : new Set<string>()

  const lines: OrderLine[] = []
  const inBundle = new Set<string>()
  const bundleView = bundles.map((b) => {
    const live = b.items.filter(i => i.product.status === 'PUBLISHED')
    const list = live.map(i => effectivePrice(i.product))
    const listSum = list.reduce((a, c) => a + c, 0)
    const open = live.filter(i => !owned.has(i.productId))
    const openList = open.map(i => effectivePrice(i.product))
    const openSum = openList.reduce((a, c) => a + c, 0)
    // Already owning part of a bundle lowers its price by that part's share
    const price = listSum ? Math.min(openSum, Math.round(b.price * openSum / listSum)) : 0
    const shares = splitByWeight(price, openList)
    open.forEach((i, k) => {
      inBundle.add(i.productId)
      lines.push({ productId: i.productId, sellerId: i.product.sellerId, title: i.product.title, unitPrice: shares[k]!, discount: openList[k]! - shares[k]!, bundleId: b.id })
    })
    return { id: b.id, key: `b:${b.id}`, slug: b.slug, title: b.title, cover: publicUrl(b.cover), listPrice: listSum, price, owned: !open.length, products: live.map(i => ({ ...toProductCard(i.product), owned: owned.has(i.productId) })) }
  }).filter(b => b.products.length >= 2)

  const items = products.map(p => ({ ...toProductCard(p), owned: owned.has(p.id), inBundle: inBundle.has(p.id), sellerId: p.sellerId }))
  const plain = items.filter(i => !i.owned && !i.inBundle)
  const plainLines: OrderLine[] = plain.map(i => ({ productId: i.id, sellerId: i.sellerId, title: i.title, unitPrice: i.finalPrice, discount: 0, bundleId: null }))

  // Coupon: only on products bought on their own, not on bundles
  let coupon: { id: string, code: string, amount: number } | null = null
  let couponError: CouponError | null = null
  let couponMin = 0
  if (couponCode) {
    const code = normalizeCode(couponCode)
    const c = await prisma.coupon.findUnique({ where: { code } })
    const subtotal = plainLines.reduce((a, l) => a + l.unitPrice, 0)
    couponError = !c ? 'invalid' : couponProblem(c, subtotal)
    if (couponError === 'minTotal') couponMin = c!.minTotal
    if (c && !couponError && userId) {
      const usedByMe = await prisma.order.count({ where: { userId, couponId: c.id, status: 'PAID' } })
      if (usedByMe >= c.perUser) couponError = 'usedByMe'
    }
    if (c && !couponError) {
      let eligibleIds = plainLines.filter(l => l.unitPrice > 0).map(l => l.productId)
      if (c.productId) eligibleIds = eligibleIds.filter(id => id === c.productId)
      if (c.sectionId && eligibleIds.length) {
        const inSection = await prisma.product.findMany({ where: { AND: [{ id: { in: eligibleIds } }, await productsInSection(c.sectionId)] }, select: { id: true } })
        const set = new Set(inSection.map(p => p.id))
        eligibleIds = eligibleIds.filter(id => set.has(id))
      }
      const eligible = plainLines.filter(l => eligibleIds.includes(l.productId))
      const amount = couponAmount(c, eligible.reduce((a, l) => a + l.unitPrice, 0))
      if (!amount) couponError = 'notApplicable'
      else {
        splitByWeight(amount, eligible.map(l => l.unitPrice)).forEach((d, k) => {
          eligible[k]!.unitPrice -= d
          eligible[k]!.discount += d
        })
        coupon = { id: c.id, code: c.code, amount }
      }
    }
  }
  lines.push(...plainLines)
  const total = lines.reduce((a, l) => a + l.unitPrice, 0)
  const discount = lines.reduce((a, l) => a + l.discount, 0)
  return { items, bundles: bundleView, lines, subtotal: total + discount, discount, total, coupon: coupon && { code: coupon.code, amount: coupon.amount }, couponId: coupon?.id ?? null, couponError, couponMin }
}
