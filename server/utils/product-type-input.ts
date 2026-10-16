import { z } from 'zod'

const option = z.object({ value: z.string().trim().min(1), label: localized })

export const attributeInput = z.object({
  id: z.string().optional(),
  key: z.string().trim().min(1).max(50).regex(/^[a-z][a-z0-9_]*$/, 'Lowercase letters, numbers and _'),
  name: localized,
  kind: z.enum(['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTISELECT']),
  options: z.array(option).nullish(),
  unit: localizedOptional,
  required: z.boolean().default(false),
  filterable: z.boolean().default(false),
  showAsBadge: z.boolean().default(false),
  autoFilled: z.boolean().default(false),
})

export const productTypeInput = z.object({
  key: z.string().trim().min(1).max(50).regex(/^[a-z][a-z0-9_-]*$/, 'Lowercase letters, numbers, - and _'),
  name: localized,
  description: localizedOptional,
  plugin: z.string().nullish(),
  icon: z.string().nullish(),
  enabled: z.boolean().default(true),
  attributes: z.array(attributeInput).default([]),
}).superRefine((v, ctx) => {
  const keys = v.attributes.map(a => a.key)
  if (new Set(keys).size !== keys.length) ctx.addIssue({ code: 'custom', message: 'Field keys must be unique', path: ['attributes'] })
  for (const [i, a] of v.attributes.entries()) {
    if ((a.kind === 'SELECT' || a.kind === 'MULTISELECT') && !a.options?.length) {
      ctx.addIssue({ code: 'custom', message: 'Add at least one option', path: ['attributes', i, 'options'] })
    }
  }
})

export type ProductTypeInput = z.infer<typeof productTypeInput>

/** Create/update/delete the type's attribute definitions to match `attrs` (order = list order). */
export async function syncAttributes(productTypeId: string, attrs: ProductTypeInput['attributes']) {
  const existing = await prisma.attributeDefinition.findMany({ where: { productTypeId } })
  const keep = new Set(attrs.map(a => a.key))
  await prisma.$transaction(async (tx) => {
    for (const old of existing) if (!keep.has(old.key)) await tx.attributeDefinition.delete({ where: { id: old.id } })
    for (const [i, a] of attrs.entries()) {
      const data = { name: a.name, kind: a.kind, options: (a.options ?? undefined) as any, unit: (a.unit ?? undefined) as any, required: a.required, filterable: a.filterable, showAsBadge: a.showAsBadge, autoFilled: a.autoFilled, sortOrder: i }
      await tx.attributeDefinition.upsert({
        where: { productTypeId_key: { productTypeId, key: a.key } },
        create: { productTypeId, key: a.key, ...data },
        update: data,
      })
    }
  })
}
