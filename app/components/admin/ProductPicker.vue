<script setup lang="ts">
/** Pick products by searching their titles; keeps the chosen order. Single mode holds one id. */
const props = defineProps<{ max?: number, single?: boolean }>()
const model = defineModel<string[] | string | null>()
const { t } = useI18n()
const { l, money } = useL()

const ids = computed<string[]>(() => Array.isArray(model.value) ? model.value : model.value ? [model.value] : [])
const known = ref<Record<string, any>>({})
const q = ref('')
const results = ref<any[]>([])
const searching = ref(false)

async function fetchMissing() {
  const missing = ids.value.filter(id => !known.value[id])
  if (!missing.length) return
  const r = await $fetch<any>('/api/admin/products', { query: { ids: missing.join(','), perPage: 100 } })
  for (const p of r.items) known.value[p.id] = p
}
watch(ids, fetchMissing, { immediate: true })

let timer: ReturnType<typeof setTimeout> | undefined
watch(q, (v) => {
  clearTimeout(timer)
  if (!v.trim()) { results.value = []; return }
  timer = setTimeout(async () => {
    searching.value = true
    try {
      const r = await $fetch<any>('/api/admin/products', { query: { q: v, perPage: 8 } })
      results.value = r.items
      for (const p of r.items) known.value[p.id] = p
    }
    finally { searching.value = false }
  }, 250)
})

function set(next: string[]) { model.value = props.single ? (next[0] ?? null) : next }
function add(p: any) {
  q.value = ''
  results.value = []
  if (ids.value.includes(p.id)) return
  set(props.single ? [p.id] : [...ids.value, p.id].slice(0, props.max ?? 50))
}
const remove = (id: string) => set(ids.value.filter(x => x !== id))
function move(i: number, dir: -1 | 1) {
  const next = [...ids.value]
  const j = i + dir
  if (j < 0 || j >= next.length) return
  ;[next[i], next[j]] = [next[j]!, next[i]!]
  set(next)
}
</script>

<template>
  <div class="space-y-2">
    <ul v-if="ids.length" class="divide-y divide-default rounded-lg border border-default">
      <li v-for="(id, i) in ids" :key="id" class="flex items-center gap-2 px-3 py-2 text-sm">
        <span class="flex-1 min-w-0 truncate">{{ known[id] ? l(known[id].title) : id }}</span>
        <span v-if="known[id]" class="text-muted text-xs">{{ known[id].isFree ? t('product.free') : money(known[id].finalPrice) }}</span>
        <template v-if="!single">
          <UButton icon="i-lucide-arrow-up" size="xs" color="neutral" variant="ghost" :aria-label="t('admin.section.up')" @click="move(i, -1)" />
          <UButton icon="i-lucide-arrow-down" size="xs" color="neutral" variant="ghost" :aria-label="t('admin.section.down')" @click="move(i, 1)" />
        </template>
        <UButton icon="i-lucide-x" size="xs" color="error" variant="ghost" :aria-label="t('admin.delete')" @click="remove(id)" />
      </li>
    </ul>
    <div v-if="!single || !ids.length" class="relative">
      <UInput v-model="q" icon="i-lucide-search" :loading="searching" :placeholder="t('admin.pickProduct')" class="w-full" />
      <ul v-if="results.length" class="absolute z-20 inset-x-0 mt-1 max-h-64 overflow-auto rounded-lg border border-default bg-default shadow-lg">
        <li v-for="p in results" :key="p.id">
          <button type="button" class="w-full flex items-center gap-2 px-3 py-2 text-sm text-start hover:bg-elevated disabled:opacity-50" :disabled="ids.includes(p.id)" @click="add(p)">
            <span class="flex-1 truncate">{{ l(p.title) }}</span>
            <span class="text-xs text-muted">{{ p.isFree ? t('product.free') : money(p.finalPrice) }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
