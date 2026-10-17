export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const b = await saveBundle(null, await readValidatedBody(event, bundleInput.parse))
  await logAdmin(user.id, 'bundle.create', b.id)
  return b
})
