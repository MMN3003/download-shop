import { z } from 'zod'

const body = z.object({
  percent: percentSchema,
  note: z.string().optional().transform(v => plainText(v, 1000) || null),
}).and(agreementScope)

/** The seller proposes a commission, for the whole shop, one section or one product. */
export default defineEventHandler(async (event) => {
  const { seller } = await approvedSeller(event)
  const { percent, note, sectionId, productId } = await readValidatedBody(event, body.parse)
  if (productId && !await prisma.product.count({ where: { id: productId, sellerId: seller.id } })) throw createError({ statusCode: 404, message: 'Product not found' })
  if (sectionId && !await prisma.section.count({ where: { id: sectionId } })) throw createError({ statusCode: 404, message: 'Section not found' })
  const open = await prisma.commissionAgreement.count({ where: { sellerId: seller.id, status: 'PROPOSED', proposedBy: 'seller' } })
  if (open >= 3) throw createError({ statusCode: 429, message: 'Wait for an answer to your open proposals first' })
  return prisma.commissionAgreement.create({ data: { sellerId: seller.id, percent, note, sectionId, productId, proposedBy: 'seller' } })
})
