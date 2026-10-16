export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const id = getRouterParam(event, 'id')!
  const { items, ...data } = await readValidatedBody(event, optionListInput.parse)
  if (await prisma.optionList.findFirst({ where: { key: data.key, id: { not: id } } })) throw createError({ statusCode: 409, message: 'This key is already used' })
  const list = await prisma.optionList.update({ where: { id }, data })
  await saveOptionItems(id, items)
  await logAdmin(user.id, 'optionList.update', id)
  return list
})
