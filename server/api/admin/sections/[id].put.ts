export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const id = getRouterParam(event, 'id')!
  const data = await readValidatedBody(event, sectionInput.parse)
  await assertNoCycle(id, data.parentId)
  const clash = await prisma.section.findFirst({ where: { slug: data.slug, id: { not: id } } })
  if (clash) throw createError({ statusCode: 409, message: 'This slug is already used' })
  const before = await prisma.section.findUniqueOrThrow({ where: { id } })
  const section = await prisma.section.update({ where: { id }, data: data as any })
  // Children generated from a list the section no longer uses become ordinary sections
  if (before.childrenListId && before.childrenListId !== section.childrenListId) {
    await prisma.section.updateMany({ where: { parentId: id, optionItem: { listId: before.childrenListId } }, data: { optionItemId: null } })
  }
  await syncSectionChildren(id)
  await logAdmin(user.id, 'section.update', id)
  return section
})
