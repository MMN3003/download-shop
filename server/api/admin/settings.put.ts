import { z } from 'zod'

const body = z.object({
  storeName: localized,
  tagline: localizedText,
  logo: z.string().nullish(),
  currency: z.string().min(1),
  currencyLabel: localized,
  defaultCommissionPercent: z.number().min(0).max(100),
  social: z.record(z.string(), z.string()).default({}),
  payments: z.object({
    zarinpal: z.object({ enabled: z.boolean(), merchantId: z.string().trim(), sandbox: z.boolean() }),
    card: z.object({ enabled: z.boolean(), cardNumber: z.string().trim(), holder: z.string().trim(), bank: z.string().trim() }),
    iban: z.object({ enabled: z.boolean(), sheba: z.string().trim(), holder: z.string().trim(), bank: z.string().trim() }),
  }),
  downloadLimit: z.number().int().min(0),
  marketplace: z.object({ sellersOpen: z.boolean(), payoutHoldDays: z.number().int().min(0).max(90), minPayout: z.number().int().min(0) }),
  reviews: z.object({ enabled: z.boolean(), moderate: z.boolean() }),
  requests: z.object({ enabled: z.boolean(), listKey: z.string().trim().min(1), perDay: z.number().int().min(1).max(100) }),
}).partial().superRefine((v, ctx) => {
  const p = v.payments
  if (p?.zarinpal.enabled && !/^[0-9a-f-]{36}$/i.test(p.zarinpal.merchantId) && !p.zarinpal.sandbox) ctx.addIssue({ code: 'custom', message: 'ZarinPal merchant ID should be 36 characters', path: ['payments'] })
  if (p?.card.enabled && p.card.cardNumber.replace(/\D/g, '').length !== 16) ctx.addIssue({ code: 'custom', message: 'Card number must have 16 digits', path: ['payments'] })
  if (p?.iban.enabled && !/^IR\d{24}$/.test(p.iban.sheba.replace(/\s/g, '').toUpperCase())) ctx.addIssue({ code: 'custom', message: 'Sheba must look like IR + 24 digits', path: ['payments'] })
})

export default defineEventHandler(async (event) => {
  const user = await requireOwner(event)
  const data = await readValidatedBody(event, body.parse)
  await saveSettings(data as any)
  await logAdmin(user.id, 'settings.update', undefined, Object.keys(data))
  return getSettings()
})
