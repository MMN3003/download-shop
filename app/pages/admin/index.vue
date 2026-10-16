<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { num, date } = useL()
const { data } = await useFetch('/api/admin/stats')
const localePath = useLocalePath()
const { money } = useL()
const cards = computed(() => data.value ? [
  { label: t('admin.stats.products'), value: data.value.products, icon: 'i-lucide-package' },
  { label: t('admin.stats.published'), value: data.value.published, icon: 'i-lucide-badge-check' },
  { label: t('admin.stats.inReview'), value: data.value.inReview, icon: 'i-lucide-hourglass' },
  { label: t('admin.stats.sections'), value: data.value.sections, icon: 'i-lucide-folder-tree' },
  { label: t('admin.stats.types'), value: data.value.types, icon: 'i-lucide-shapes' },
  { label: t('admin.stats.users'), value: data.value.users, icon: 'i-lucide-users' },
] : [])
</script>

<template>
  <UDashboardPanel>
    <template #header><UDashboardNavbar :title="t('admin.dashboard')"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar></template>
    <template #body>
      <div class="grid gap-4 sm:grid-cols-2 mb-4">
        <NuxtLink :to="localePath('/admin/orders?status=AWAITING_VERIFICATION')">
          <UCard :class="data?.pendingReceipts ? 'ring-2 ring-info' : ''">
            <div class="flex items-center gap-3">
              <span class="grid place-items-center size-10 rounded-lg bg-info/10 text-info"><UIcon name="i-lucide-receipt" class="size-5" /></span>
              <div><p class="text-sm text-muted">{{ t('admin.statsExtra.pending') }}</p><p class="text-2xl font-extrabold">{{ num(data?.pendingReceipts ?? 0) }}</p></div>
            </div>
          </UCard>
        </NuxtLink>
        <UCard>
          <div class="flex items-center gap-3">
            <span class="grid place-items-center size-10 rounded-lg bg-success/10 text-success"><UIcon name="i-lucide-trending-up" class="size-5" /></span>
            <div><p class="text-sm text-muted">{{ t('admin.statsExtra.sales30') }}</p><p class="text-2xl font-extrabold">{{ money(data?.sales30.total ?? 0) }} <span class="text-sm text-muted font-normal">({{ num(data?.sales30.count ?? 0) }})</span></p></div>
          </div>
        </UCard>
      </div>
      <div class="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <UCard v-for="c in cards" :key="c.label">
          <div class="flex items-center gap-3">
            <span class="grid place-items-center size-10 rounded-lg bg-primary/10 text-primary"><UIcon :name="c.icon" class="size-5" /></span>
            <div><p class="text-sm text-muted">{{ c.label }}</p><p class="text-2xl font-extrabold">{{ num(c.value) }}</p></div>
          </div>
        </UCard>
      </div>
      <UCard class="mt-6">
        <template #header><h2 class="font-bold">{{ t('admin.stats.recent') }}</h2></template>
        <ul class="divide-y divide-default text-sm">
          <li v-for="r in data?.recent" :key="r.id" class="py-2 flex justify-between gap-4">
            <span dir="ltr">{{ r.action }}</span>
            <span class="text-muted">{{ r.user?.name || r.user?.email }} · {{ date(r.createdAt) }}</span>
          </li>
        </ul>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
