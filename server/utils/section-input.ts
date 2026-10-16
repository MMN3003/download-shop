import { z } from 'zod'

export const sectionInput = z.object({
  slug: slugSchema,
  name: localized,
  description: localizedOptional,
  icon: z.string().nullish(),
  banner: z.string().nullish(),
  seoTitle: localizedOptional,
  seoDesc: localizedOptional,
  showOnHome: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  parentId: z.string().nullish(),
})

/** A section may not be moved under itself or one of its children. */
export async function assertNoCycle(id: string, parentId: string | null | undefined) {
  if (!parentId) return
  const desc = await sectionWithDescendants(id)
  if (desc.includes(parentId)) throw createError({ statusCode: 422, message: 'A section cannot be placed inside itself' })
}
