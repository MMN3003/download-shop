import { z } from 'zod'

const block = z.object({
  id: z.string().regex(/^[\w-]{1,40}$/),
  type: z.enum(['sections', 'featured', 'newest', 'popular', 'free', 'section', 'bundles', 'blog', 'banner', 'how']),
  enabled: z.boolean(),
  title: localizedOptional,
  sectionId: z.string().nullish(),
  image: imageKey.nullish(),
  // Banner links stay inside the store or go to an https page
  link: z.string().trim().max(500).nullish().refine(v => !v || /^\/(?!\/)/.test(v) || /^https:\/\//.test(v), 'Use a path like /s/arabic or an https:// address'),
  limit: z.number().int().min(1).max(24).optional(),
}).refine(b => b.type !== 'section' || b.sectionId, { message: 'Choose a section', path: ['sectionId'] })
  .refine(b => b.type !== 'banner' || b.image, { message: 'A banner needs an image', path: ['image'] })

export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const { blocks } = await readValidatedBody(event, z.object({ blocks: z.array(block).max(30) }).parse)
  const clean = blocks.map(b => ({ ...b, title: b.title ? Object.fromEntries(Object.entries(b.title).map(([k, v]) => [k, plainText(v, 120)])) : null }))
  await saveSettings({ home: { blocks: clean as any } })
  await logAdmin(user.id, 'home.update', undefined, { blocks: clean.length })
  return clean
})
