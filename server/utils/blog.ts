import { z } from 'zod'

export const blogInput = z.object({
  slug: slugSchema,
  title: localized,
  excerpt: localizedOptional,
  body: localizedOptional,
  cover: imageKey.nullish(),
  status: z.enum(['draft', 'published']).default('draft'),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  productIds: z.array(z.string()).max(12).default([]),
  seoTitle: localizedOptional,
  seoDesc: localizedOptional,
})

/** Excerpts are plain text; the body is HTML cleaned like product descriptions. */
export function blogRow(data: z.infer<typeof blogInput>) {
  const plain = (t: Record<string, string> | null | undefined, max: number) => t ? Object.fromEntries(Object.entries(t).map(([k, v]) => [k, plainText(v, max)])) : t
  return {
    ...data,
    title: plain(data.title, 200) as Record<string, string>,
    excerpt: plain(data.excerpt, 500) as any,
    body: cleanHtml(data.body) as any,
    seoTitle: plain(data.seoTitle, 200) as any,
    seoDesc: plain(data.seoDesc, 300) as any,
    tags: data.tags.map(t => plainText(t, 40)).filter(Boolean),
  }
}

export const toBlogCard = (p: { id: string, slug: string, title: unknown, excerpt: unknown, cover: string | null, publishedAt: Date | null, tags: string[] }) =>
  ({ id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, cover: publicUrl(p.cover), publishedAt: p.publishedAt, tags: p.tags })
