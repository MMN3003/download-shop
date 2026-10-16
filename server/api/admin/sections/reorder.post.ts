import { z } from 'zod'

const body = z.object({ items: z.array(z.object({ id: z.string(), parentId: z.string().nullable(), sortOrder: z.number().int() })) })

export default defineEventHandler(async (event) => {
  await requireEditor(event)
  const { items } = await readValidatedBody(event, body.parse)
  await prisma.$transaction(items.map(i => prisma.section.update({ where: { id: i.id }, data: { parentId: i.parentId, sortOrder: i.sortOrder } })))
  return { ok: true }
})
