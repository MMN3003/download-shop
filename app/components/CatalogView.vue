<script setup lang="ts">
/**
 * Product listing with filters kept in the URL query, so filtered pages can
 * be shared and indexed. Filters come from the product types' filterable fields.
 */
const props = defineProps<{ section?: string }>()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { l, num } = useL()
const { data: store } = await useStore()

const query = computed(() => ({ ...route.query, ...(props.section ? { section: props.section } : {}) }))
const { data, status } = await useFetch('/api/products', { query, watch: [query] })

function setQuery(patch: Record<string, string | undefined>) {
  const next: Record<string, any> = { ...route.query, ...patch, page: undefined }
  for (const k of Object.keys(next)) if (next[k] === undefined || next[k] === '') delete next[k]
  router.replace({ query: next })
}

const types = computed(() => store.value?.productTypes ?? [])
const activeType = computed(() => types.value.find(x => x.key === route.query.type))
// Show the filters of the selected type, or of every type when only one exists
const filters = computed(() => {
  const list = activeType.value ? [activeType.value] : types.value.length === 1 ? types.value : []
  return list.flatMap(x => x.filters)
})

const sortItems = computed(() => [
  { label: t('catalog.sortNew'), value: 'new' },
  { label: t('catalog.sortPopular'), value: 'popular' },
  { label: t('catalog.sortRating'), value: 'rating' },
  { label: t('catalog.sortPriceAsc'), value: 'price_asc' },
  { label: t('catalog.sortPriceDesc'), value: 'price_desc' },
])

function selected(key: string): string[] {
  return String(route.query[`attr_${key}`] ?? '').split(',').filter(Boolean)
}
function toggleOption(key: string, value: string, on: boolean) {
  const cur = new Set(selected(key))
  if (on) cur.add(value)
  else cur.delete(value)
  setQuery({ [`attr_${key}`]: [...cur].join(',') || undefined })
}
const hasFilters = computed(() => Object.keys(route.query).some(k => k.startsWith('attr_') || ['free', 'type', 'minPrice', 'maxPrice'].includes(k)))
function clearFilters() {
  router.replace({ query: route.query.q ? { q: route.query.q } : {} })
}
const page = computed(() => Number(route.query.page) || 1)
const filtersOpen = ref(false)
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[16rem_1fr]">
    <aside class="space-y-5" :class="filtersOpen ? '' : 'hidden lg:block'">
      <div class="flex items-center justify-between">
        <h2 class="font-bold">{{ t('catalog.filters') }}</h2>
        <UButton v-if="hasFilters" size="xs" variant="link" color="neutral" :label="t('catalog.clear')" @click="clearFilters" />
      </div>

      <div v-if="types.length > 1" class="space-y-2">
        <p class="text-sm font-medium">{{ t('catalog.type') }}</p>
        <URadioGroup
          :model-value="String(route.query.type ?? '')"
          :items="[{ label: t('catalog.allTypes'), value: '' }, ...types.map(x => ({ label: l(x.name), value: x.key }))]"
          @update:model-value="v => setQuery({ type: (v as string) || undefined })"
        />
      </div>

      <USwitch :model-value="route.query.free === '1'" :label="t('catalog.onlyFree')" @update:model-value="v => setQuery({ free: v ? '1' : undefined })" />

      <div v-for="f in filters" :key="f.key" class="space-y-2">
        <p class="text-sm font-medium">{{ l(f.name) }}</p>
        <template v-if="f.kind === 'SELECT' || f.kind === 'MULTISELECT'">
          <UCheckbox
            v-for="o in f.options ?? []" :key="o.value" :label="l(o.label)"
            :model-value="selected(f.key).includes(o.value)"
            @update:model-value="v => toggleOption(f.key, o.value, !!v)"
          />
        </template>
        <USwitch v-else-if="f.kind === 'BOOLEAN'" :label="t('catalog.yes')" :model-value="route.query[`attr_${f.key}`] === '1'" @update:model-value="v => setQuery({ [`attr_${f.key}`]: v ? '1' : undefined })" />
        <div v-else-if="f.kind === 'NUMBER'" class="flex gap-2">
          <UInput type="number" :placeholder="t('catalog.min')" :model-value="String(route.query[`attr_${f.key}_min`] ?? '')" @change="(e: Event) => setQuery({ [`attr_${f.key}_min`]: (e.target as HTMLInputElement).value || undefined })" />
          <UInput type="number" :placeholder="t('catalog.max')" :model-value="String(route.query[`attr_${f.key}_max`] ?? '')" @change="(e: Event) => setQuery({ [`attr_${f.key}_max`]: (e.target as HTMLInputElement).value || undefined })" />
        </div>
      </div>
    </aside>

    <section class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-muted text-sm">{{ t('catalog.results', { n: num(data?.total ?? 0) }) }}</p>
        <div class="flex items-center gap-2">
          <UButton class="lg:hidden" icon="i-lucide-sliders-horizontal" color="neutral" variant="outline" :label="t('catalog.filters')" @click="filtersOpen = !filtersOpen" />
          <USelect :model-value="String(route.query.sort ?? 'new')" :items="sortItems" class="w-48" @update:model-value="v => setQuery({ sort: v === 'new' ? undefined : String(v) })" />
        </div>
      </div>

      <div v-if="status === 'pending' && !data" class="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <USkeleton v-for="i in 8" :key="i" class="h-72" />
      </div>
      <ProductGrid v-else-if="data?.items.length" :items="data.items" />
      <UEmpty v-else icon="i-lucide-search-x" :title="t('catalog.noResults')" />

      <div v-if="data && data.total > data.perPage" class="flex justify-center pt-4">
        <UPagination :page="page" :total="data.total" :items-per-page="data.perPage" @update:page="p => router.replace({ query: { ...route.query, page: String(p) } })" />
      </div>
    </section>
  </div>
</template>
