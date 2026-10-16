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

/** Error message from a failed $fetch, falling back to a generic one. */
export function apiError(e: any, fallback = ''): string {
  return e?.data?.message || e?.data?.data?.issues?.[0]?.message || e?.message || fallback
}
