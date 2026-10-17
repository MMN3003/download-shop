export default defineEventHandler(async (event) => {
  const access = await catalogAccess(event)
  const input = await readValidatedBody(event, productInput.parse)
  if (!access.staff) {
    input.sellerId = access.seller!.id
    input.featured = false
  }
  else if (!input.sellerId) {
    input.sellerId = access.seller?.id ?? null
  }
  input.status = sellerStatus(access, input.status) as typeof input.status
  const p = await saveProduct(null, input)
  await logAdmin(access.user.id, 'product.create', p.id)
  return p
})
