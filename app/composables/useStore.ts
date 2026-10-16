export interface StoreData {
  settings: { storeName: Record<string, string>, tagline: Record<string, string>, logo: string | null, currency: string, currencyLabel: Record<string, string>, social: Record<string, string> }
  sections: { id: string, slug: string, name: Record<string, string>, icon: string | null, parentId: string | null, showOnHome: boolean }[]
  productTypes: { key: string, name: Record<string, string>, icon: string | null, filters: FilterDef[] }[]
}

export interface FilterDef {
  key: string
  name: Record<string, string>
  kind: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTISELECT'
  options: { value: string, label: Record<string, string>, icon?: string, image?: string }[] | null
  unit: Record<string, string> | null
}

/** Store-wide data (settings, sections, filters), loaded once per page load. */
export function useStore() {
  return useFetch<StoreData>('/api/store', { key: 'store', dedupe: 'defer' })
}

/** Localise multi-language text and format numbers/prices for the current locale. */
export function useL() {
  const { locale } = useI18n()
  const store = useNuxtData<StoreData>('store')
  const l = (text: unknown) => localize(text, locale.value)
  const intlLocale = computed(() => (locale.value === 'fa' ? 'fa-IR' : 'en-US'))
  const num = (n: number | null | undefined) => n == null ? '' : new Intl.NumberFormat(intlLocale.value).format(n)
  const money = (n: number) => `${num(n)} ${l(store.data.value?.settings.currencyLabel) || ''}`.trim()
  const date = (d: string | Date | null | undefined) => d ? new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium' }).format(new Date(d)) : ''
  const bytes = (n: number) => n > 1048576 ? `${num(Math.round(n / 104857.6) / 10)} MB` : `${num(Math.round(n / 1024))} KB`
  return { l, num, money, date, bytes, locale }
}

/** Label for an attribute value (option label, yes/no, number with unit). */
export function useAttrFormat() {
  const { l, num } = useL()
  const { t } = useI18n()
  return (def: { kind: string, options?: any, unit?: any }, value: unknown): string => {
    if (value == null || value === '') return ''
    const opts = (def.options ?? []) as { value: string, label: Record<string, string> }[]
    const label = (v: string) => l(opts.find(o => o.value === v)?.label) || v
    switch (def.kind) {
      case 'BOOLEAN': return value ? t('product.yes') : t('product.no')
      case 'NUMBER': return `${num(value as number)} ${l(def.unit)}`.trim()
      case 'SELECT': return label(String(value))
      case 'MULTISELECT': return (value as string[]).map(label).join('، ')
      default: return String(value)
    }
  }
}
