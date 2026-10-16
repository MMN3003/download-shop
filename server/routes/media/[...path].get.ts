import { extname } from 'node:path'

const TYPES: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf',
}

/** Serves public files (covers, screenshots, preview media). */
export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'path') || ''
  try {
    const data = await getFile('public', key)
    const type = TYPES[extname(key).toLowerCase()] || 'application/octet-stream'
    setHeader(event, 'Content-Type', type)
    // SVGs can carry scripts; only allow them as images
    if (type === 'image/svg+xml') setHeader(event, 'Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'")
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
    return data
  }
  catch {
    throw createError({ statusCode: 404, message: 'Not found' })
  }
})
