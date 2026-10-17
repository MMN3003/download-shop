import type { H3Event } from 'h3'
import { z } from 'zod'

export const messageInput = z.object({ body: z.string().transform(v => plainText(v, 4000)).pipe(z.string().min(1, 'Write a message')) })

/** The choices for source/target, from the shared list named in settings. */
export async function requestOptions() {
  const { requests } = await getSettings()
  const list = await prisma.optionList.findUnique({ where: { key: requests.listKey } })
  return { enabled: requests.enabled, listName: list?.name ?? null, options: list ? await listOptions(list.id) : [] }
}

export const requestInclude = {
  messages: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true } } } },
  product: { select: { slug: true, title: true } },
} as const

export function toPublicRequest(r: any) {
  return {
    number: r.number, source: r.source, target: r.target, subject: r.subject, details: r.details, status: r.status,
    unread: r.unreadUser, createdAt: r.createdAt, updatedAt: r.updatedAt,
    product: r.product ? { slug: r.product.slug, title: r.product.title } : null,
    // Staff names stay private; buyers see "Support"
    messages: r.messages?.map((m: any) => ({ id: m.id, body: m.body, fromStaff: m.fromStaff, createdAt: m.createdAt })),
  }
}

export async function ownRequest(event: H3Event) {
  const user = await requireUser(event)
  const number = Number(getRouterParam(event, 'number'))
  const r = Number.isInteger(number) ? await prisma.productRequest.findFirst({ where: { number, userId: user.id }, include: requestInclude }) : null
  if (!r) throw createError({ statusCode: 404, message: 'Request not found' })
  return { user, request: r }
}
