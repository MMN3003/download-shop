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
  /** Each payment method is switched on separately. Secrets stay in env vars. */
  payments: {
    zarinpal: { enabled: false, merchantId: '', sandbox: true },
    card: { enabled: false, cardNumber: '', holder: '', bank: '' },
    iban: { enabled: false, sheba: '', holder: '', bank: '' },
  },
  /** How many times a buyer may download each product (0 = unlimited) */
  downloadLimit: 10,
  /** Product requests: buyers ask for something from one list value to another (e.g. Arabic → Persian) */
  requests: { enabled: true, listKey: 'languages', perDay: 3 },
  /** Marketplace: who may apply to sell, and when seller money can be paid out */
  marketplace: { sellersOpen: true, payoutHoldDays: 14, minPayout: 100000 },
}

export type StoreSettings = typeof DEFAULT_SETTINGS

export async function getSettings(): Promise<StoreSettings> {
  const rows = await prisma.setting.findMany()
  const out: any = structuredClone(DEFAULT_SETTINGS)
  for (const r of rows) {
    const def = (DEFAULT_SETTINGS as any)[r.key]
    // Merge objects one level deep so new default keys appear in old stores
    out[r.key] = def && typeof def === 'object' && !Array.isArray(def) && r.value && typeof r.value === 'object'
      ? mergeDeep(def, r.value)
      : r.value
  }
  return out
}

export async function saveSettings(patch: Partial<StoreSettings>) {
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in DEFAULT_SETTINGS)) continue
    await prisma.setting.upsert({ where: { key }, create: { key, value: value as any }, update: { value: value as any } })
  }
}

function mergeDeep(base: any, over: any): any {
  const out: any = { ...base }
  for (const [k, v] of Object.entries(over)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base?.[k] && typeof base[k] === 'object' ? mergeDeep(base[k], v) : v
  }
  return out
}
