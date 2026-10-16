import type { H3Event } from 'h3'

/** The signed-in user's order from the route's :number, or 404. */
export async function ownOrder(event: H3Event) {
  const user = await requireUser(event)
  const number = Number(getRouterParam(event, 'number'))
  const order = Number.isInteger(number) ? await prisma.order.findFirst({ where: { number, userId: user.id }, include: orderInclude }) : null
  if (!order) throw createError({ statusCode: 404, message: 'Order not found' })
  return order
}
