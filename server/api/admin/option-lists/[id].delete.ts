export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const id = getRouterParam(event, 'id')!
  const used = await prisma.attributeDefinition.count({ where: { optionListId: id } })
  if (used) throw createError({ statusCode: 409, message: 'This list is used by product fields. Switch those fields to their own options first.' })
  // Generated sections stay, as ordinary sections
  await prisma.section.updateMany({ where: { optionItem: { listId: id } }, data: { optionItemId: null } })
  await prisma.optionList.delete({ where: { id } })
  await logAdmin(user.id, 'optionList.delete', id)
  return { ok: true }
})
