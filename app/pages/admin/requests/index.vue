<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { date, num } = useL()
const localePath = useLocalePath()
const q = ref('')
const status = ref('OPEN')
const page = ref(1)
const query = computed(() => ({ q: q.value || undefined, status: status.value === '__all' ? undefined : status.value, page: page.value }))
const { data } = await useFetch<any>('/api/admin/requests', { query, watch: [query] })
const tabs = computed(() => [...['OPEN', 'IN_PROGRESS', 'DONE', 'DECLINED'].map(s => ({ label: t(`request.status.${s}`), value: s })), { label: t('admin.order.all'), value: '__all' }])
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('admin.requests')"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar>
      <UDashboardToolbar><UTabs v-model="status" :items="tabs" :content="false" variant="link" size="sm" class="overflow-x-auto" /></UDashboardToolbar>
    </template>
    <template #body>
      <UInput v-model="q" icon="i-lucide-search" :placeholder="t('admin.request.search')" class="w-full sm:w-96" />
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <ul class="divide-y divide-default">
          <li v-for="r in data?.items" :key="r.id">
            <NuxtLink :to="localePath(`/admin/requests/${r.id}`)" class="flex items-center gap-4 px-4 py-3 hover:bg-elevated/50">
              <span class="size-2 rounded-full shrink-0" :class="r.unreadStaff ? 'bg-primary' : 'bg-transparent'" />
              <span class="font-bold w-12">#{{ num(r.number) }}</span>
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ r.subject }}</p>
                <p class="text-xs text-muted"><RequestRoute :source="r.source" :target="r.target" :options="data.options" /> · {{ r.user.name || r.user.phone || r.user.email }}</p>
              </div>
              <span class="text-xs text-muted hidden sm:flex items-center gap-1"><UIcon name="i-lucide-message-square" />{{ num(r._count.messages) }}</span>
              <span class="text-sm text-muted hidden sm:block">{{ date(r.updatedAt) }}</span>
              <RequestStatus :status="r.status" />
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
