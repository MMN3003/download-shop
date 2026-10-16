export default defineEventHandler(async (event) => {
  await requireOwner(event)
  const s = await getSettings()
  return { ...s, logoUrl: publicUrl(s.logo) }
})
