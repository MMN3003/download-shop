/** Deleting a section moves its children up to its parent; products just lose the link. */
export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const id = getRouterParam(event, 'id')!
  const s = await prisma.section.findUniqueOrThrow({ where: { id } })
  await prisma.$transaction([
    prisma.section.updateMany({ where: { parentId: id }, data: { parentId: s.parentId } }),
    prisma.section.delete({ where: { id } }),
  ])
  await logAdmin(user.id, 'section.delete', id, { slug: s.slug })
  return { ok: true }
})
