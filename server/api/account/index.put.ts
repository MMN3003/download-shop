import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const session = await requireUser(event)
  const { name } = await readValidatedBody(event, z.object({ name: z.string().transform(v => plainText(v, 80)) }).parse)
  const user = await prisma.user.update({ where: { id: session.id }, data: { name: name || null } })
  await startSession(event, user)
  return { ok: true }
})
