export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const b = await saveBundle(getRouterParam(event, 'id')!, await readValidatedBody(event, bundleInput.parse))
  await logAdmin(user.id, 'bundle.update', b.id)
  return b
})
