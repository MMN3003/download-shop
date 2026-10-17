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
    // Uploaded files never run as pages: no type sniffing, and no scripts even if opened directly (e.g. an SVG)
    setHeader(event, 'X-Content-Type-Options', 'nosniff')
    setHeader(event, 'Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox")
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
    return data
  }
  catch {
    throw createError({ statusCode: 404, message: 'Not found' })
  }
})
