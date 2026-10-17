export default defineEventHandler(async (event) => {
  await requireEditor(event)
  const { home } = await getSettings()
  return home.blocks.map(b => ({ ...b, imageUrl: publicUrl(b.image) }))
})
