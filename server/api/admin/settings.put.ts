import { z } from 'zod'

const body = z.object({
  storeName: localized,
  tagline: localizedOptional,
  logo: z.string().nullish(),
  currency: z.string().min(1),
  currencyLabel: localized,
  defaultCommissionPercent: z.number().min(0).max(100),
  social: z.record(z.string(), z.string()).default({}),
}).partial()

export default defineEventHandler(async (event) => {
  const user = await requireOwner(event)
  const data = await readValidatedBody(event, body.parse)
  await saveSettings(data as any)
  await logAdmin(user.id, 'settings.update', undefined, Object.keys(data))
  return getSettings()
})
