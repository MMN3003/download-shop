<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { l, money, date, num } = useL()
const localePath = useLocalePath()
const route = useRoute()
const q = ref('')
const status = ref(String(route.query.status ?? 'AWAITING_VERIFICATION'))
const page = ref(1)
const query = computed(() => ({ q: q.value || undefined, status: status.value === '__all' ? undefined : status.value, page: page.value }))
const { data } = await useFetch<any>('/api/admin/orders', { query, watch: [query] })
const statuses = ['AWAITING_VERIFICATION', 'PENDING_PAYMENT', 'PAID', 'REJECTED', 'CANCELLED', 'REFUNDED']
const tabs = computed(() => [...statuses.map(s => ({ label: t(`order.status.${s}`), value: s })), { label: t('admin.order.all'), value: '__all' }])
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('admin.orders')"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar>
      <UDashboardToolbar>
        <UTabs v-model="status" :items="tabs" :content="false" variant="link" size="sm" class="overflow-x-auto" />
      </UDashboardToolbar>
    </template>
    <template #body>
      <UInput v-model="q" icon="i-lucide-search" :placeholder="t('admin.order.search')" class="w-full sm:w-96" />
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <ul class="divide-y divide-default">
          <li v-for="o in data?.items" :key="o.id">
            <NuxtLink :to="localePath(`/admin/orders/${o.id}`)" class="flex items-center gap-4 px-4 py-3 hover:bg-elevated/50">
              <span class="font-bold w-16">#{{ num(o.number) }}</span>
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ o.user.name || o.user.phone || o.user.email }}</p>
                <p class="text-xs text-muted truncate">{{ o.items.map((i: any) => l(i.title)).join('، ') }}</p>
              </div>
              <span class="text-sm text-muted hidden sm:block">{{ date(o.createdAt) }}</span>
              <span class="text-sm w-28 text-end">{{ money(o.total) }}</span>
              <OrderStatus :status="o.status" />
            </NuxtLink>
          </li>
        </ul>
        <UEmpty v-if="!data?.items.length" icon="i-lucide-inbox" :title="t('catalog.noResults')" class="py-10" />
      </UCard>
      <div v-if="data && data.total > data.perPage" class="flex justify-center">
        <UPagination v-model:page="page" :total="data.total" :items-per-page="data.perPage" />
      </div>
    </template>
  </UDashboardPanel>
</template>
