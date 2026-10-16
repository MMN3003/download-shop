import type { Prisma } from '@prisma/client'
import { createError } from 'h3'
import { prisma } from './prisma'
import { putFile, publicUrl } from './storage'
import { normalizeSearch } from '../../shared/utils/i18n-text'
import { effectivePrice } from '../../shared/utils/price'
import { getPlugin } from '../product-plugins'
import type { PluginAnalysis } from '../product-plugins/types'
import { rewriteMedia } from '../product-plugins/anki-render'

export type AttrInput = Record<string, string | number | boolean | string[] | null | undefined>

/** Product includes used by both the storefront and the admin panel. */
export const productInclude = {
  productType: { include: { attributes: { orderBy: { sortOrder: 'asc' } } } },
  attributes: true,
  sections: { include: { section: true } },
  seller: { select: { id: true, slug: true, displayName: true, avatar: true } },
  previews: { orderBy: { position: 'asc' } },
  files: { where: { isCurrent: true }, orderBy: { createdAt: 'desc' } },
} satisfies Prisma.ProductInclude

export type ProductWithAll = Prisma.ProductGetPayload<{ include: typeof productInclude }>

/** Attribute values as { key: value } (MULTISELECT → string[]). */
export function attributeMap(p: Pick<ProductWithAll, 'attributes' | 'productType'>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const def of p.productType.attributes) {
    const vals = p.attributes.filter(v => v.attributeId === def.id)
    if (!vals.length) continue
    switch (def.kind) {
      case 'NUMBER': out[def.key] = vals[0]!.valueNumber; break
      case 'BOOLEAN': out[def.key] = vals[0]!.valueBool; break
      case 'MULTISELECT': out[def.key] = vals.map(v => v.valueText).filter(Boolean); break
      default: out[def.key] = vals[0]!.valueText
    }
  }
  return out
}

/** Replace a product's attribute values with `input` (only keys defined on its type). */
export async function writeAttributes(tx: Prisma.TransactionClient, productId: string, productTypeId: string, input: AttrInput, onlyKeys?: string[]) {
  const defs = await tx.attributeDefinition.findMany({ where: { productTypeId } })
  for (const def of defs) {
    if (!(def.key in input)) continue
    if (onlyKeys && !onlyKeys.includes(def.key)) continue
    await tx.productAttributeValue.deleteMany({ where: { productId, attributeId: def.id } })
    const raw = input[def.key]
    if (raw == null || raw === '') continue
    const base = { productId, attributeId: def.id }
    if (def.kind === 'NUMBER') {
      const n = Number(raw)
      if (!Number.isNaN(n)) await tx.productAttributeValue.create({ data: { ...base, valueNumber: n } })
    }
    else if (def.kind === 'BOOLEAN') {
      await tx.productAttributeValue.create({ data: { ...base, valueBool: raw === true || raw === 'true' } })
    }
    else if (def.kind === 'MULTISELECT') {
      const list = Array.isArray(raw) ? raw : String(raw).split(',')
      for (const v of list.map(String).filter(Boolean)) {
        await tx.productAttributeValue.create({ data: { ...base, valueText: v } })
      }
    }
    else {
      await tx.productAttributeValue.create({ data: { ...base, valueText: String(raw) } })
    }
  }
}

/** Build the normalised search text from titles, descriptions, tags and text attributes. */
export async function refreshSearchText(productId: string) {
  const p = await prisma.product.findUnique({ where: { id: productId }, include: { attributes: { include: { attribute: true } }, sections: { include: { section: true } } } })
  if (!p) return
  const texts: string[] = []
  const push = (v: unknown) => {
    if (!v) return
    if (typeof v === 'string') texts.push(v)
    else if (typeof v === 'object') texts.push(...Object.values(v as Record<string, string>).filter(x => typeof x === 'string'))
  }
  push(p.title); push(p.shortDesc); push(p.description)
  texts.push(...p.tags)
  for (const s of p.sections) push(s.section.name)
  for (const a of p.attributes) {
    if (!a.valueText) continue
    const opts = (a.attribute.options as { value: string, label: Record<string, string> }[] | null) ?? []
    const opt = opts.find(o => o.value === a.valueText)
    if (opt) push(opt.label)
    else if (a.attribute.kind === 'TEXT') texts.push(a.valueText)
  }
  await prisma.product.update({ where: { id: productId }, data: { searchText: normalizeSearch(texts.join(' ').replace(/<[^>]*>/g, ' ')) } })
}

/** Run the product type's plugin on an uploaded main file and store its results. */
export async function applyPluginAnalysis(productId: string, analysis: PluginAnalysis) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } })
  const defs = await prisma.attributeDefinition.findMany({ where: { productTypeId: product.productTypeId, autoFilled: true } })
  // Save preview media to public storage and point the preview HTML at it
  const previews = []
  for (const [i, pv] of analysis.previews.entries()) {
    const urls: Record<string, string> = {}
    for (const m of pv.media ?? []) {
      const key = `previews/${productId}/${i}-${m.name.replace(/[^\w.\-]/g, '_')}`
      await putFile('public', key, m.data)
      urls[m.name] = publicUrl(key)!
    }
    const data: Record<string, unknown> = { ...pv.data }
    for (const field of ['front', 'back', 'html']) {
      if (typeof data[field] === 'string') {
        data[field] = rewriteMedia(data[field] as string, n => urls[n] ?? null)
      }
    }
    previews.push({ productId, kind: pv.kind, data: data as Prisma.InputJsonValue, position: i })
  }
  await prisma.$transaction(async (tx) => {
    await writeAttributes(tx, productId, product.productTypeId, analysis.attributes as AttrInput, defs.map(d => d.key))
    await tx.productPreview.deleteMany({ where: { productId } })
    if (previews.length) await tx.productPreview.createMany({ data: previews })
  })
}

export async function analyzeWithPlugin(pluginKey: string | null, data: Uint8Array, filename: string): Promise<PluginAnalysis | null> {
  const plugin = getPlugin(pluginKey)
  if (!plugin) return null
  if (!plugin.extensions.some(ext => filename.toLowerCase().endsWith(ext))) {
    throw createError({ statusCode: 422, message: `This product type expects ${plugin.extensions.join(', ')} files` })
  }
  try {
    return await plugin.analyze(data, filename)
  }
  catch (e: any) {
    throw createError({ statusCode: e?.statusCode ?? 500, message: e?.message ?? 'Could not read the file' })
  }
}

/** Public shape of a product: no storage keys, prices resolved, attributes as a map. */
export function toPublicProduct(p: ProductWithAll) {
  return {
    id: p.id,
    slug: p.slug,
    status: p.status,
    featured: p.featured,
    title: p.title,
    shortDesc: p.shortDesc,
    description: p.description,
    learnPoints: p.learnPoints,
    cover: publicUrl(p.cover),
    screenshots: p.screenshots.map(s => publicUrl(s)),
    price: p.price,
    salePrice: p.salePrice,
    saleStartsAt: p.saleStartsAt,
    saleEndsAt: p.saleEndsAt,
    isFree: p.isFree,
    finalPrice: effectivePrice(p),
    tags: p.tags,
    salesCount: p.salesCount,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    seoTitle: p.seoTitle,
    seoDesc: p.seoDesc,
    publishedAt: p.publishedAt,
    updatedAt: p.updatedAt,
    productType: {
      key: p.productType.key,
      name: p.productType.name,
      plugin: p.productType.plugin,
      attributes: p.productType.attributes.map(a => ({ key: a.key, name: a.name, kind: a.kind, options: a.options, unit: a.unit, showAsBadge: a.showAsBadge, filterable: a.filterable })),
    },
    attributes: attributeMap(p),
    sections: p.sections.map(s => ({ slug: s.section.slug, name: s.section.name })),
    seller: p.seller,
    previews: p.previews.map(pv => ({ kind: pv.kind, data: pv.data })),
    files: p.files.map(f => ({ kind: f.kind, version: f.version, filename: f.filename, size: f.size, changelog: f.changelog, createdAt: f.createdAt })),
  }
}

/** Card-sized product for grids and lists. */
export function toProductCard(p: ProductWithAll) {
  const full = toPublicProduct(p)
  const badges = p.productType.attributes.filter(a => a.showAsBadge).map(a => ({ key: a.key, name: a.name, kind: a.kind, options: a.options, unit: a.unit, value: full.attributes[a.key] })).filter(b => b.value != null && b.value !== false)
  return {
    id: full.id, slug: full.slug, title: full.title, shortDesc: full.shortDesc, cover: full.cover,
    price: full.price, finalPrice: full.finalPrice, isFree: full.isFree, ratingAvg: full.ratingAvg, ratingCount: full.ratingCount,
    productType: { key: full.productType.key, name: full.productType.name }, badges, seller: full.seller,
  }
}

/** All ids of a section and its descendants. */
export async function sectionWithDescendants(sectionId: string): Promise<string[]> {
  const all = await prisma.section.findMany({ select: { id: true, parentId: true } })
  const ids = [sectionId]
  for (let i = 0; i < ids.length; i++) {
    for (const s of all) if (s.parentId === ids[i]) ids.push(s.id)
  }
  return ids
}
