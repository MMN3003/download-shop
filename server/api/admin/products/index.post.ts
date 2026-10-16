export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const input = await readValidatedBody(event, productInput.parse)
  if (!input.sellerId) {
    const own = await prisma.seller.findUnique({ where: { userId: user.id } })
    input.sellerId = own?.id ?? null
  }
  const p = await saveProduct(null, input)
  await logAdmin(user.id, 'product.create', p.id)
  return p
})
