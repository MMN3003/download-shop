export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const id = getRouterParam(event, 'id')!
  const input = await readValidatedBody(event, productInput.parse)
  const p = await saveProduct(id, input)
  await logAdmin(user.id, 'product.update', id, { status: input.status })
  return p
})
