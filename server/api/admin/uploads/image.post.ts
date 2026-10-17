const ALLOWED = ['.png', '.jpg', '.jpeg', '.webp', '.gif']

/** Upload a public image (cover, screenshot, banner, logo). Returns its storage key and URL. */
export default defineEventHandler(async (event) => {
  await catalogAccess(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.filename)
  if (!file) throw createError({ statusCode: 400, message: 'No file uploaded' })
  // Trust the bytes, not the file name
  const ext = sniffType(file.data)
  if (!ext || !ALLOWED.includes(ext)) throw createError({ statusCode: 422, message: `Allowed: ${ALLOWED.join(', ')}` })
  if (file.data.length > 10 * 1024 * 1024) throw createError({ statusCode: 413, message: 'Image is larger than 10 MB' })
  const key = makeKey('images', `image${ext}`)
  await putFile('public', key, file.data)
  return { key, url: publicUrl(key) }
})
