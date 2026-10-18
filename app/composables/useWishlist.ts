let loading: Promise<void> | null = null

/** Saved products of the signed-in buyer, shared by every heart button on the page. */
export function useWishlist() {
  const { loggedIn } = useUserSession()
  const ids = useState<string[] | null>('wishlist-ids', () => null)
  const localePath = useLocalePath()
  const toast = useToast()
  const { t } = useI18n()
  // One request however many hearts are on the page
  function load() {
    if (ids.value !== null || !loggedIn.value) return
    loading ??= $fetch<string[]>('/api/wishlist/ids').catch(() => []).then((r) => { ids.value = r }).finally(() => { loading = null })
    return loading
  }
  const has = (id: string) => loggedIn.value && !!ids.value?.includes(id)
  async function toggle(id: string) {
    if (!loggedIn.value) return navigateTo({ path: localePath('/login'), query: { redirect: useRoute().fullPath } })
    const saved = has(id)
    ids.value = saved ? (ids.value ?? []).filter(x => x !== id) : [...(ids.value ?? []), id]
    try {
      await $fetch(`/api/wishlist/${id}`, { method: saved ? 'DELETE' : 'PUT' })
      if (!saved) toast.add({ title: t('wishlist.added'), color: 'success', actions: [{ label: t('wishlist.title'), to: localePath('/library?tab=wishlist') }] })
    }
    catch (e: any) {
      ids.value = saved ? [...(ids.value ?? []), id] : (ids.value ?? []).filter(x => x !== id)
      toast.add({ title: apiError(e), color: 'error' })
    }
  }
  return { ids, load, has, toggle }
}
