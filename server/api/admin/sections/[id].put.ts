export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const id = getRouterParam(event, 'id')!
  const data = await readValidatedBody(event, sectionInput.parse)
  await assertNoCycle(id, data.parentId)
  const clash = await prisma.section.findFirst({ where: { slug: data.slug, id: { not: id } } })
  if (clash) throw createError({ statusCode: 409, message: 'This slug is already used' })
  const section = await prisma.section.update({ where: { id }, data: data as any })
  await logAdmin(user.id, 'section.update', id)
  return section
})
