import { getPlugin } from '../../../product-plugins'

export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const { attributes, ...data } = await readValidatedBody(event, productTypeInput.parse)
  if (data.plugin && !getPlugin(data.plugin)) throw createError({ statusCode: 422, message: 'Unknown plugin' })
  if (await prisma.productType.findUnique({ where: { key: data.key } })) throw createError({ statusCode: 409, message: 'This key is already used' })
  const type = await prisma.productType.create({ data: data as any })
  await syncAttributes(type.id, attributes)
  await logAdmin(user.id, 'productType.create', type.id)
  return type
})
