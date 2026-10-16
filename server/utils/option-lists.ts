import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { publicUrl } from './storage'
import { sectionWithDescendants } from './catalog'

/** Options in the shape stored on AttributeDefinition.options. */
export async function listOptions(listId: string) {
  const items = await prisma.optionItem.findMany({ where: { listId }, orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }] })
  return items.map(i => ({ value: i.value, label: i.label as Record<string, string>, icon: i.icon ?? undefined, image: publicUrl(i.image) ?? undefined }))
}

/**
 * A shared list is the single source for its choices. After any change, copy
 * it to every field that uses it and regenerate the sections built from it.
 */
export async function syncOptionList(listId: string) {
  const options = await listOptions(listId)
  await prisma.attributeDefinition.updateMany({ where: { optionListId: listId }, data: { options: options as Prisma.InputJsonValue } })
  const parents = await prisma.section.findMany({ where: { childrenListId: listId } })
  for (const parent of parents) await syncSectionChildren(parent.id)
}

/** Make a section's children match its list: one child per item, same name, icon and order. */
export async function syncSectionChildren(sectionId: string) {
  const parent = await prisma.section.findUniqueOrThrow({ where: { id: sectionId } })
  if (!parent.childrenListId) return
  const items = await prisma.optionItem.findMany({ where: { listId: parent.childrenListId }, orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }], include: { section: true } })
  for (const [i, item] of items.entries()) {
    const data = { name: item.label as Prisma.InputJsonValue, icon: item.icon, parentId: parent.id, sortOrder: i }
    if (item.section) {
      await prisma.section.update({ where: { id: item.section.id }, data })
      continue
    }
    // Adopt an existing section with the same slug, otherwise create one
    const slug = item.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-')
    const existing = await prisma.section.findUnique({ where: { slug } })
    if (existing && !existing.optionItemId) {
      await prisma.section.update({ where: { id: existing.id }, data: { ...data, optionItemId: item.id } })
    }
    else {
      const free = existing ? `${parent.slug}-${slug}` : slug
      await prisma.section.create({ data: { ...data, slug: free, optionItemId: item.id } })
    }
  }
}

/**
 * Products in the given sections or their sub-sections. A generated section
 * also holds every product whose section-linked field has its value.
 */
export async function productsInSection(sectionId: string): Promise<Prisma.ProductWhereInput> {
  const ids = await sectionWithDescendants(sectionId)
  const linked = await prisma.section.findMany({ where: { id: { in: ids }, optionItemId: { not: null } }, include: { optionItem: true } })
  const or: Prisma.ProductWhereInput[] = [{ sections: { some: { sectionId: { in: ids } } } }]
  const byList = new Map<string, string[]>()
  for (const s of linked) {
    if (!s.optionItem) continue
    byList.set(s.optionItem.listId, [...(byList.get(s.optionItem.listId) ?? []), s.optionItem.value])
  }
  for (const [listId, values] of byList) {
    or.push({ attributes: { some: { valueText: { in: values }, attribute: { optionListId: listId, linksSections: true } } } })
  }
  return { OR: or }
}
