import { createError } from 'h3'
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises'
import { dirname, join, normalize, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

/**
 * File storage. Public files (covers, screenshots, preview media) are served
 * at /media/<key>. Private files (the products being sold) are only read by
 * the server and delivered through access-checked download routes.
 * Local disk for now; an S3-compatible driver can implement the same functions.
 */
export type Visibility = 'public' | 'private'

function root(): string {
  return resolve(process.env.STORAGE_DIR || './storage')
}

function safePath(visibility: Visibility, key: string): string {
  const base = join(root(), visibility)
  const full = normalize(join(base, key))
  if (!full.startsWith(base)) throw createError({ statusCode: 400, message: 'Invalid path' })
  return full
}

export function makeKey(prefix: string, filename: string): string {
  const ext = (filename.match(/\.[a-z0-9]{1,8}$/i)?.[0] || '').toLowerCase()
  return `${prefix}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}${ext}`
}

export async function putFile(visibility: Visibility, key: string, data: Buffer | Uint8Array) {
  const path = safePath(visibility, key)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, data)
  return key
}

export async function getFile(visibility: Visibility, key: string): Promise<Buffer> {
  return readFile(safePath(visibility, key))
}

export async function deleteFile(visibility: Visibility, key: string) {
  await unlink(safePath(visibility, key)).catch(() => {})
}

export function publicUrl(key: string | null | undefined): string | null {
  return key ? `/media/${key}` : null
}
