import { z } from 'zod'
import { prisma } from './prisma'
import { syncOptionList } from './option-lists'

export const optionListInput = z.object({
  key: z.string().trim().min(1).max(50).regex(/^[a-z][a-z0-9_-]*$/, 'Lowercase letters, numbers, - and _'),
  name: localized,
  items: z.array(z.object({
    id: z.string().optional(),
    value: z.string().trim().min(1).max(60).regex(/^[a-z0-9][a-z0-9_-]*$/, 'Lowercase letters, numbers, - and _'),
    label: localized,
    icon: z.string().nullish(),
    image: z.string().nullish(),
  })).default([]),
}).superRefine((v, ctx) => {
  const values = v.items.map(i => i.value)
  if (new Set(values).size !== values.length) ctx.addIssue({ code: 'custom', message: 'Values must be unique', path: ['items'] })
})

export type OptionListInput = z.infer<typeof optionListInput>

/** Save a list's items in order. Renamed values are carried over to products that use them. */
export async function saveOptionItems(listId: string, items: OptionListInput['items']) {
  const existing = await prisma.optionItem.findMany({ where: { listId } })
  const keepIds = new Set(items.map(i => i.id).filter(Boolean))
  await prisma.$transaction(async (tx) => {
    for (const old of existing) if (!keepIds.has(old.id)) await tx.optionItem.delete({ where: { id: old.id } })
    // Free up values first so swaps and renames don't hit the unique index
    for (const old of existing) if (keepIds.has(old.id)) await tx.optionItem.update({ where: { id: old.id }, data: { value: `__tmp_${old.id}` } })
    for (const [i, item] of items.entries()) {
      const data = { value: item.value, label: item.label, icon: item.icon || null, image: item.image || null, sortOrder: i }
      const old = existing.find(o => o.id === item.id)
      if (old) {
        await tx.optionItem.update({ where: { id: old.id }, data })
        if (old.value !== item.value) {
          await tx.productAttributeValue.updateMany({ where: { valueText: old.value, attribute: { optionListId: listId } }, data: { valueText: item.value } })
        }
      }
      else {
        await tx.optionItem.create({ data: { ...data, listId } })
      }
    }
  })
  await syncOptionList(listId)
}
