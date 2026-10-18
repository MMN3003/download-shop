/** Cart of product ids, kept in a cookie so it survives reloads and works with SSR. */
export function useCart() {
  const ids = useCookie<string[]>('cart', { default: () => [], maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })
  const has = (id: string) => ids.value.includes(id)
  const add = (id: string) => { if (!has(id)) ids.value = [...ids.value, id] }
  const remove = (id: string) => { ids.value = ids.value.filter(x => x !== id) }
  const clear = () => { ids.value = [] }
  const count = computed(() => ids.value.length)
  return { ids, has, add, remove, clear, count }
}

let translate: ((key: string, params?: Record<string, unknown>) => string) | null = null
/** Set once by plugins/i18n-errors.ts, so apiError can be called after an await. */
export function setErrorTranslator(t: typeof translate) { translate = t }

/**
 * Message for a failed $fetch in the visitor's language. Server messages are
 * English; known ones are looked up in `serverErrors` (shared/utils/server-errors.ts).
 */
export function apiError(e: any, fallback = ''): string {
  const issue = e?.data?.data?.issues?.[0]
  // A validation failure's useful text is in its first issue, not in "Validation Error"
  const raw: string = issue?.message || e?.data?.message || ''
  const known = raw ? serverErrorKey(raw) : null
  if (translate && known) return translate(`serverErrors.${known.key}`, known.params)
  if (translate && issue) return translate('serverErrors.checkForm')
  if (raw && !/^(HTTP|Fetch|FetchError|\[)/.test(raw)) return raw
  return fallback || (translate ? translate('serverErrors.generic') : e?.message || '')
}
