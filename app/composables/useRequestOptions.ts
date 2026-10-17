/** Source/target choices for requests, with flags, and a lookup by value. */
export async function useRequestOptions() {
  const { l } = useL()
  const { data } = await useFetch<{ enabled: boolean, options: { value: string, label: Record<string, string>, icon?: string, image?: string }[] }>('/api/requests/options', { key: 'request-options' })
  const options = computed(() => data.value?.options ?? [])
  const items = computed(() => options.value.map(o => ({ value: o.value, label: l(o.label), icon: o.icon, avatar: o.image ? { src: o.image } : undefined })))
  const find = (v: string) => options.value.find(o => o.value === v)
  return { data, options, items, find }
}
