import type { H3Event } from 'h3'
import type { Prisma } from '@prisma/client'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getPaymentMethod, paymentMethods } from '../payment-methods'

/** Absolute site URL for gateway callbacks (SITE_URL wins over the request's host). */
export function siteUrl(event: H3Event) {
  return (process.env.SITE_URL || getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin).replace(/\/$/, '')
}

export async function enabledPaymentMethods() {
  const s = await getSettings()
  return paymentMethods.filter(m => m.enabled(s)).map(m => ({ key: m.key, kind: m.kind, name: m.name, icon: m.icon, info: m.publicInfo(s) }))
}

/** Published products from `ids`, with what the user already owns marked. */
export async function quoteProducts(ids: string[], userId?: string) {
  const products = await prisma.product.findMany({ where: { id: { in: [...new Set(ids)] }, status: 'PUBLISHED' }, include: productInclude })
  const owned = userId
    ? new Set((await prisma.libraryItem.findMany({ where: { userId, productId: { in: products.map(p => p.id) }, revoked: false } })).map(x => x.productId))
    : new Set<string>()
  const items = products.map(p => ({ ...toProductCard(p), owned: owned.has(p.id), sellerId: p.sellerId }))
  const payable = items.filter(i => !i.owned)
  return { items, total: payable.reduce((n, i) => n + i.finalPrice, 0) }
}

/**
 * Mark an order paid and give the buyer access. Safe to call more than once
 * (gateway callback and admin approval can race): only the first call acts.
 */
export async function markOrderPaid(orderId: string) {
  const done = await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({ where: { id: orderId, status: { notIn: ['PAID', 'REFUNDED'] } }, data: { status: 'PAID', paidAt: new Date() } })
    if (!count) return null
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, user: true } })
    for (const item of order.items) {
      // Store/seller split, frozen now so later rate changes never touch past earnings
      const percent = await commissionPercent(item.sellerId, item.productId, order.paidAt ?? new Date())
      const commission = Math.round(item.unitPrice * percent / 100)
      await tx.orderItem.update({ where: { id: item.id }, data: { commissionPercent: percent, commission, sellerNet: item.unitPrice - commission } })
      await tx.libraryItem.upsert({
        where: { userId_productId: { userId: order.userId, productId: item.productId } },
        create: { userId: order.userId, productId: item.productId, orderId: order.id },
        update: { revoked: false, orderId: order.id },
      })
      await tx.product.update({ where: { id: item.productId }, data: { salesCount: { increment: 1 } } })
    }
    return order
  })
  if (done && done.total > 0) {
    await notifyUser(done.user, `Order #${done.number} paid`, `سفارش #${done.number} پرداخت شد. فایل‌ها در کتابخانه شما آماده دانلود است.\nOrder #${done.number} is paid. Your files are ready in your library.`)
  }
  return !!done
}

/** Start (or restart) paying an order with `methodKey`. Returns where the buyer goes next. */
export async function startPayment(event: H3Event, orderId: string, methodKey: string, locale: string) {
  const settings = await getSettings()
  const method = getPaymentMethod(methodKey)
  if (!method || !method.enabled(settings)) throw createError({ statusCode: 422, message: 'This payment method is not available' })
  const order = await prisma.order.update({ where: { id: orderId }, data: { paymentMethod: method.key }, include: { user: true } })
  const prefix = locale === 'fa' ? '' : `/${locale}`
  const orderPage = `${prefix}/orders/${order.number}`
  if (method.kind === 'manual') return { next: orderPage }
  const payment = await prisma.payment.create({ data: { orderId, method: method.key, amount: order.total } })
  const returnUrl = `${siteUrl(event)}/api/payments/${method.key}/callback?p=${payment.id}&l=${locale}`
  return { next: (await method.start!({ event, order, payment, settings, returnUrl })).redirect }
}

export const orderInclude = {
  items: { include: { product: { select: { slug: true, cover: true } } } },
  payments: { orderBy: { createdAt: 'desc' } },
} satisfies Prisma.OrderInclude

/** Buyer-facing order: no internal fields, plus transfer details for manual methods. */
export async function toPublicOrder(order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>) {
  const methods = await enabledPaymentMethods()
  return {
    number: order.number, status: order.status, total: order.total, subtotal: order.subtotal, discount: order.discount,
    currency: order.currency, paymentMethod: order.paymentMethod, paidAt: order.paidAt, createdAt: order.createdAt,
    items: order.items.map(i => ({ productId: i.productId, slug: i.product.slug, cover: publicUrl(i.product.cover), title: i.title, unitPrice: i.unitPrice })),
    payments: order.payments.map(p => ({ method: p.method, status: p.status, amount: p.amount, refId: p.refId, reference: p.reference, rejectReason: p.rejectReason, createdAt: p.createdAt })),
    methods,
  }
}

// Signed, short-lived download links (work without cookies, e.g. when opened in AnkiDroid)
const LINK_TTL_MS = 10 * 60_000
const sign = (payload: string) => createHmac('sha256', `${process.env.NUXT_SESSION_PASSWORD || 'dev'}:downloads`).update(payload).digest('base64url')

export function makeDownloadToken(libraryItemId: string, fileId: string) {
  const payload = `${libraryItemId}.${fileId}.${Date.now() + LINK_TTL_MS}`
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`
}

export function readDownloadToken(token: string) {
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const payload = Buffer.from(body, 'base64url').toString()
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  const [libraryItemId, fileId, exp] = payload.split('.')
  if (!libraryItemId || !fileId || Number(exp) < Date.now()) return null
  return { libraryItemId, fileId }
}
