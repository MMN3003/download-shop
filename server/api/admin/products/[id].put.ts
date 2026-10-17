export default defineEventHandler(async (event) => {
  const access = await catalogAccess(event)
  const prev = await productForAccess(access, getRouterParam(event, 'id')!)
  const input = await readValidatedBody(event, productInput.parse)
  if (!access.staff) {
    input.sellerId = prev.sellerId
    input.featured = prev.featured
  }
  input.status = sellerStatus(access, input.status, prev) as typeof input.status
  const p = await saveProduct(prev.id, input)
  await logAdmin(access.user.id, 'product.update', prev.id, { status: input.status })
  return p
})
