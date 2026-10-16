import { prisma } from './prisma'
/** Store settings live in the Setting table so one codebase can run any store. */
export const DEFAULT_SETTINGS = {
  storeName: { fa: 'فروشگاه من', en: 'My Store' } as Record<string, string>,
  tagline: { fa: 'فایل‌های آموزشی آماده دانلود', en: 'Ready-to-download learning files' } as Record<string, string>,
  logo: null as string | null,
  currency: 'IRT',
  currencyLabel: { fa: 'تومان', en: 'Toman' } as Record<string, string>,
  defaultCommissionPercent: 25,
  social: { instagram: '', telegram: '' } as Record<string, string>,
}

export type StoreSettings = typeof DEFAULT_SETTINGS

export async function getSettings(): Promise<StoreSettings> {
  const rows = await prisma.setting.findMany()
  const out: any = structuredClone(DEFAULT_SETTINGS)
  for (const r of rows) out[r.key] = r.value
  return out
}

export async function saveSettings(patch: Partial<StoreSettings>) {
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in DEFAULT_SETTINGS)) continue
    await prisma.setting.upsert({ where: { key }, create: { key, value: value as any }, update: { value: value as any } })
  }
}
