<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { l, money, date } = useL()
const localePath = useLocalePath()
const q = ref('')
const route = useRoute()
const status = ref(String(route.query.status || '__all'))
const page = ref(1)
const query = computed(() => ({ q: q.value || undefined, status: status.value === '__all' ? undefined : status.value, page: page.value }))
const { data } = await useFetch<any>('/api/admin/products', { query, watch: [query] })

const statuses = ['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'HIDDEN']
const statusItems = computed(() => [{ label: t('catalog.allTypes'), value: '__all' }, ...statuses.map(s => ({ label: t(`admin.product.statuses.${s}`), value: s }))])
const color = (s: string) => ({ PUBLISHED: 'success', IN_REVIEW: 'warning', DRAFT: 'neutral', HIDDEN: 'error' } as any)[s]
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('admin.products')">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UButton icon="i-lucide-plus" :label="t('admin.add')" :to="localePath('/admin/products/new')" /></template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <UInput v-model="q" icon="i-lucide-search" :placeholder="t('admin.search')" class="w-64" />
        <USelect v-model="status" :items="statusItems" class="w-44" />
      </UDashboardToolbar>
    </template>
    <template #body>
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <ul class="divide-y divide-default">
          <li v-for="p in data?.items" :key="p.id">
            <NuxtLink :to="localePath(`/admin/products/${p.id}`)" class="flex items-center gap-4 px-4 py-3 hover:bg-elevated/50">
              <div class="size-12 rounded-lg bg-elevated grid place-items-center overflow-hidden shrink-0">
                <img v-if="p.cover" :src="p.cover" alt="" class="h-full w-full object-cover">
                <UIcon v-else name="i-lucide-package" class="text-dimmed" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ l(p.title) }}</p>
                <p class="text-xs text-muted">{{ l(p.type) }} · {{ p.seller ?? '—' }} · {{ date(p.updatedAt) }}<span v-if="p.salesCount"> · {{ t('seller.sales', { n: p.salesCount }) }}</span></p>
              </div>
              <UBadge v-if="p.featured" icon="i-lucide-star" color="warning" variant="soft" size="sm" />
              <UBadge v-if="!p.files" icon="i-lucide-file-x" color="error" variant="soft" size="sm" />
              <span class="text-sm w-32 text-end">{{ p.isFree ? t('product.free') : money(p.finalPrice) }}</span>
              <UBadge :color="color(p.status)" variant="soft">{{ t(`admin.product.statuses.${p.status}`) }}</UBadge>
            </NuxtLink>
          </li>
        </ul>
        <UEmpty v-if="!data?.items.length" icon="i-lucide-package-open" :title="t('catalog.noResults')" class="py-10" />
      </UCard>
      <div v-if="data && data.total > data.perPage" class="flex justify-center mt-4">
        <UPagination v-model:page="page" :total="data.total" :items-per-page="data.perPage" />
      </div>
    </template>
  </UDashboardPanel>
</template>
