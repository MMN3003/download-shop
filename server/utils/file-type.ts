/** File type from its first bytes (a browser's claimed type or file name can be faked). */
export function sniffType(b: Buffer | Uint8Array): '.jpg' | '.png' | '.webp' | '.gif' | '.pdf' | null {
  const buf = Buffer.from(b.buffer, b.byteOffset, Math.min(b.byteLength, 16))
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return '.jpg'
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return '.png'
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return '.webp'
  if (buf.subarray(0, 4).toString('latin1') === 'GIF8') return '.gif'
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return '.pdf'
  return null
}
