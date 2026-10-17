<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { num, date } = useL()
const localePath = useLocalePath()
const q = ref('')
const status = ref('__all')
const query = computed(() => ({ q: q.value || undefined, status: status.value === '__all' ? undefined : status.value }))
const { data } = await useFetch<any[]>('/api/admin/sellers', { query, watch: [query] })
const tabs = computed(() => [{ label: t('admin.order.all'), value: '__all' }, ...['pending', 'approved', 'rejected', 'suspended'].map(s => ({ label: t(`seller.status.${s}`), value: s }))])
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('admin.sellers')"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar>
      <UDashboardToolbar><UTabs v-model="status" :items="tabs" :content="false" variant="link" size="sm" class="overflow-x-auto" /></UDashboardToolbar>
    </template>
    <template #body>
      <UInput v-model="q" icon="i-lucide-search" :placeholder="t('admin.search')" class="w-full sm:w-96" />
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <ul class="divide-y divide-default">
          <li v-for="s in data" :key="s.id">
            <NuxtLink :to="localePath(`/admin/sellers/${s.id}`)" class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-elevated/50">
              <div class="flex-1 min-w-40">
                <p class="font-medium truncate">{{ s.displayName }} <UIcon v-if="s.trusted" name="i-lucide-shield-check" class="text-success align-middle" /></p>
                <p class="text-xs text-muted"><span dir="ltr">{{ s.contact }}</span> · {{ date(s.createdAt) }} · {{ t('admin.seller.productsN', { n: num(s.products) }) }}</p>
              </div>
              <UBadge v-if="s.proposals" color="warning" variant="solid" size="sm" icon="i-lucide-percent">{{ num(s.proposals) }}</UBadge>
              <UBadge v-if="s.payouts" color="info" variant="solid" size="sm" icon="i-lucide-banknote">{{ num(s.payouts) }}</UBadge>
              <span class="text-sm w-14 text-end" :class="s.rate.isDefault ? 'text-muted' : 'font-bold'">{{ num(s.rate.percent) }}٪</span>
              <SellerStatus :status="s.status" />
            </NuxtLink>
          </li>
        </ul>
        <UEmpty v-if="!data?.length" icon="i-lucide-users" :title="t('catalog.noResults')" class="py-10" />
      </UCard>
    </template>
  </UDashboardPanel>
</template>
