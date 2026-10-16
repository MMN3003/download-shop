export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const { items, ...data } = await readValidatedBody(event, optionListInput.parse)
  if (await prisma.optionList.findUnique({ where: { key: data.key } })) throw createError({ statusCode: 409, message: 'This key is already used' })
  const list = await prisma.optionList.create({ data })
  await saveOptionItems(list.id, items)
  await logAdmin(user.id, 'optionList.create', list.id)
  return list
})
