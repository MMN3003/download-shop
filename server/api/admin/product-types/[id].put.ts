import { getPlugin } from '../../../product-plugins'

export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const id = getRouterParam(event, 'id')!
  const { attributes, ...data } = await readValidatedBody(event, productTypeInput.parse)
  if (data.plugin && !getPlugin(data.plugin)) throw createError({ statusCode: 422, message: 'Unknown plugin' })
  if (await prisma.productType.findFirst({ where: { key: data.key, id: { not: id } } })) throw createError({ statusCode: 409, message: 'This key is already used' })
  const type = await prisma.productType.update({ where: { id }, data: data as any })
  await syncAttributes(id, attributes)
  await logAdmin(user.id, 'productType.update', id)
  return type
})
