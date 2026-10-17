import { z } from 'zod'

export const bundleInput = z.object({
  slug: slugSchema,
  title: localized,
  description: localizedOptional,
  cover: imageKey.nullish(),
  price: z.number().int().min(0),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  productIds: z.array(z.string()).min(2, 'A bundle needs at least two products').max(50),
})

export async function saveBundle(id: string | null, data: z.infer<typeof bundleInput>) {
  const clash = await prisma.bundle.findFirst({ where: { slug: data.slug, ...(id ? { id: { not: id } } : {}) } })
  if (clash) throw createError({ statusCode: 409, message: 'This slug is already used' })
  const products = await prisma.product.findMany({ where: { id: { in: data.productIds } } })
  if (products.length !== new Set(data.productIds).size) throw createError({ statusCode: 422, message: 'Some products were not found' })
  const listPrice = products.reduce((a, p) => a + effectivePrice(p), 0)
  if (data.price >= listPrice) throw createError({ statusCode: 422, message: `The bundle price must be lower than the products together (${listPrice})` })
  const { productIds, ...fields } = data
  const row = { ...fields, description: cleanHtml(fields.description as Record<string, string> | null) as any }
  return prisma.$transaction(async (tx) => {
    const b = id ? await tx.bundle.update({ where: { id }, data: row }) : await tx.bundle.create({ data: row })
    await tx.bundleItem.deleteMany({ where: { bundleId: b.id } })
    await tx.bundleItem.createMany({ data: productIds.map((productId, position) => ({ bundleId: b.id, productId, position })) })
    return b
  })
}

/** A bundle as shown in the store: its products, list price and what it saves. */
export function toPublicBundle(b: { id: string, slug: string, title: unknown, description: unknown, cover: string | null, price: number, items: { product: ProductWithAll }[] }) {
  const products = b.items.map(i => i.product).filter(p => p.status === 'PUBLISHED')
  const listPrice = products.reduce((a, p) => a + effectivePrice(p), 0)
  return { id: b.id, key: `b:${b.id}`, slug: b.slug, title: b.title, description: b.description, cover: publicUrl(b.cover) ?? publicUrl(products[0]?.cover), price: b.price, listPrice, saving: Math.max(0, listPrice - b.price), products: products.map(toProductCard) }
}
