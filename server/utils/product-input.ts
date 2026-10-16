import { z } from 'zod'

export const productInput = z.object({
  slug: slugSchema,
  productTypeId: z.string().min(1),
  sellerId: z.string().nullish(),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'HIDDEN']).default('DRAFT'),
  featured: z.boolean().default(false),
  title: localized,
  shortDesc: localizedOptional,
  description: localizedOptional,
  learnPoints: z.record(z.string(), z.array(z.string())).nullish(),
  cover: z.string().nullish(),
  screenshots: z.array(z.string()).default([]),
  price: z.number().int().min(0).default(0),
  salePrice: z.number().int().min(0).nullish(),
  saleStartsAt: z.coerce.date().nullish(),
  saleEndsAt: z.coerce.date().nullish(),
  isFree: z.boolean().default(false),
  seoTitle: localizedOptional,
  seoDesc: localizedOptional,
  tags: z.array(z.string().trim().min(1)).default([]),
  sectionIds: z.array(z.string()).default([]),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])).default({}),
}).refine(v => v.isFree || v.price > 0 || v.status !== 'PUBLISHED', { message: 'Set a price or mark the product as free', path: ['price'] })
  .refine(v => v.salePrice == null || v.salePrice < v.price, { message: 'Sale price must be lower than the price', path: ['salePrice'] })

export type ProductInput = z.infer<typeof productInput>

/** Required attributes must have a value before publishing. */
export async function assertRequiredAttributes(input: ProductInput) {
  if (input.status !== 'PUBLISHED') return
  const defs = await prisma.attributeDefinition.findMany({ where: { productTypeId: input.productTypeId, required: true, autoFilled: false } })
  const missing = defs.filter((d) => {
    const v = input.attributes[d.key]
    return v == null || v === '' || (Array.isArray(v) && !v.length)
  })
  if (missing.length) {
    throw createError({ statusCode: 422, message: `Required fields missing: ${missing.map(d => localize(d.name, 'en') || d.key).join(', ')}` })
  }
}

export async function saveProduct(id: string | null, input: ProductInput) {
  await assertRequiredAttributes(input)
  const clash = await prisma.product.findFirst({ where: { slug: input.slug, ...(id ? { id: { not: id } } : {}) } })
  if (clash) throw createError({ statusCode: 409, message: 'This slug is already used' })
  const { sectionIds, attributes, ...fields } = input
  const prev = id ? await prisma.product.findUnique({ where: { id } }) : null
  const data = {
    ...fields,
    publishedAt: fields.status === 'PUBLISHED' ? (prev?.publishedAt ?? new Date()) : prev?.publishedAt ?? null,
  } as any
  const product = await prisma.$transaction(async (tx) => {
    const p = id ? await tx.product.update({ where: { id }, data }) : await tx.product.create({ data })
    await tx.productSection.deleteMany({ where: { productId: p.id } })
    if (sectionIds.length) await tx.productSection.createMany({ data: sectionIds.map(sectionId => ({ productId: p.id, sectionId })) })
    // Type changed: drop values that belonged to the old type
    if (prev && prev.productTypeId !== p.productTypeId) await tx.productAttributeValue.deleteMany({ where: { productId: p.id } })
    await writeAttributes(tx, p.id, p.productTypeId, attributes)
    return p
  })
  await refreshSearchText(product.id)
  return product
}
