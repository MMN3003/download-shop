import { z } from 'zod'
import { toLatinDigits } from '../../shared/utils/contact'
import type { H3Event } from 'h3'
import type { Prisma } from '@prisma/client'

export type CatalogAccess = { user: { id: string, role: string }, staff: boolean, seller: Prisma.SellerGetPayload<object> | null }

/**
 * Who may manage products: the owner and editors (everything), or an approved
 * seller (only their own products, which go through review).
 */
export async function catalogAccess(event: H3Event): Promise<CatalogAccess> {
  const user = await requireRole(event, ['OWNER', 'EDITOR', 'SELLER'])
  const seller = await prisma.seller.findUnique({ where: { userId: user.id } })
  const staff = user.role === 'OWNER' || user.role === 'EDITOR'
  if (staff) return { user, staff, seller }
  if (user.role === 'SELLER' && seller?.status === 'approved') return { user, staff, seller }
  throw createError({ statusCode: 403, message: 'Not allowed' })
}

/** The product, if this user may edit it. */
export async function productForAccess(access: CatalogAccess, productId: string) {
  const p = await prisma.product.findUnique({ where: { id: productId } })
  if (!p || (!access.staff && p.sellerId !== access.seller?.id)) throw createError({ statusCode: 404, message: 'Not found' })
  return p
}

/** Agreements in force at `at`, most specific first: product → section → whole seller. */
export async function commissionPercent(sellerId: string | null, productId: string, at = new Date()) {
  const { defaultCommissionPercent } = await getSettings()
  if (!sellerId) return defaultCommissionPercent
  const active = await prisma.commissionAgreement.findMany({
    where: { sellerId, status: 'ACCEPTED', startsAt: { lte: at }, OR: [{ endsAt: null }, { endsAt: { gt: at } }] },
    orderBy: { decidedAt: 'desc' },
  })
  const byProduct = active.find(a => a.productId === productId)
  if (byProduct) return byProduct.percent
  const sectionIds = (await prisma.productSection.findMany({ where: { productId } })).map(s => s.sectionId)
  const bySection = active.find(a => a.sectionId && sectionIds.includes(a.sectionId))
  if (bySection) return bySection.percent
  const whole = active.find(a => !a.productId && !a.sectionId)
  return whole?.percent ?? defaultCommissionPercent
}

/** The seller's general rate now, and when it ends. */
export async function currentRate(sellerId: string) {
  const { defaultCommissionPercent } = await getSettings()
  const now = new Date()
  const a = await prisma.commissionAgreement.findFirst({
    where: { sellerId, status: 'ACCEPTED', productId: null, sectionId: null, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
    orderBy: { decidedAt: 'desc' },
  })
  return { percent: a?.percent ?? defaultCommissionPercent, endsAt: a?.endsAt ?? null, isDefault: !a }
}

/**
 * Money owed to a seller. Earnings from paid orders become available after
 * the holding period (refunds are possible until then); requested and paid
 * payouts are taken off.
 */
export async function sellerBalance(sellerId: string, db: Prisma.TransactionClient = prisma) {
  const { marketplace } = await getSettings()
  const cutoff = new Date(Date.now() - marketplace.payoutHoldDays * 86400_000)
  const [ready, held, out] = await Promise.all([
    db.orderItem.aggregate({ where: { sellerId, order: { status: 'PAID', paidAt: { lte: cutoff } } }, _sum: { sellerNet: true } }),
    db.orderItem.aggregate({ where: { sellerId, order: { status: 'PAID', paidAt: { gt: cutoff } } }, _sum: { sellerNet: true } }),
    db.payout.aggregate({ where: { sellerId, status: { in: ['REQUESTED', 'PAID'] } }, _sum: { amount: true } }),
  ])
  const earned = ready._sum.sellerNet ?? 0
  const paidOut = out._sum.amount ?? 0
  return { available: Math.max(0, earned - paidOut), held: held._sum.sellerNet ?? 0, paidOut, minPayout: marketplace.minPayout, holdDays: marketplace.payoutHoldDays }
}

export async function notifySeller(sellerId: string, subject: string, text: string) {
  const s = await prisma.seller.findUnique({ where: { id: sellerId }, include: { user: true } })
  if (s) await notifyUser(s.user, subject, text)
}

export const shebaSchema = (z: typeof import('zod').z) => z.string().transform(v => toLatinDigits(v).replace(/[\s-]/g, '').toUpperCase()).pipe(z.string().regex(/^IR\d{24}$/, 'Sheba must look like IR + 24 digits'))

/**
 * What a seller may do to their own product: no featuring, and nothing goes
 * live without review unless the seller is trusted. An untrusted edit to a
 * live product sends it back to the review queue.
 */
export function sellerStatus(access: CatalogAccess, wanted: string, _prev?: { status: string } | null) {
  if (access.staff || access.seller?.trusted) return wanted
  return wanted === 'PUBLISHED' ? 'IN_REVIEW' : wanted
}

/** Products of a seller as shown on public pages. */
export const publicSeller = (s: { slug: string, displayName: string, bio: string | null, avatar: string | null }) =>
  ({ slug: s.slug, displayName: s.displayName, bio: s.bio, avatar: publicUrl(s.avatar) })

export const agreementInclude = {
  section: { select: { id: true, name: true } },
  product: { select: { id: true, title: true, slug: true } },
} as const

/** Whether an agreement covers a product, a section or the whole shop. */
export const agreementScope = z.object({
  scope: z.enum(['seller', 'section', 'product']).default('seller'),
  sectionId: z.string().nullish(),
  productId: z.string().nullish(),
}).transform(v => ({ sectionId: v.scope === 'section' ? v.sectionId ?? null : null, productId: v.scope === 'product' ? v.productId ?? null : null, scope: v.scope }))
  .refine(v => v.scope !== 'section' || v.sectionId, { message: 'Choose a section', path: ['sectionId'] })
  .refine(v => v.scope !== 'product' || v.productId, { message: 'Choose a product', path: ['productId'] })

export const percentSchema = z.coerce.number().min(0).max(100)

/** The signed-in user's seller account; approved unless `allowPending`. */
export async function approvedSeller(event: H3Event, opts: { allowPending?: boolean } = {}) {
  const user = await requireUser(event)
  const seller = await prisma.seller.findUnique({ where: { userId: user.id } })
  if (!seller || (seller.status !== 'approved' && !(opts.allowPending && seller.status === 'pending'))) {
    throw createError({ statusCode: 403, message: 'Your seller account is not active' })
  }
  return { user, seller }
}
