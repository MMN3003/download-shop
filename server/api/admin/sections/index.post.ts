export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const data = await readValidatedBody(event, sectionInput.parse)
  const exists = await prisma.section.findUnique({ where: { slug: data.slug } })
  if (exists) throw createError({ statusCode: 409, message: 'This slug is already used' })
  const section = await prisma.section.create({ data: data as any })
  await syncSectionChildren(section.id)
  await logAdmin(user.id, 'section.create', section.id)
  return section
})
