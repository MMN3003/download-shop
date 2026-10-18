<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { num, date } = useL()
const { user } = useUserSession()
const isSeller = computed(() => (user.value as any)?.role === 'SELLER')
const { data } = await useFetch('/api/admin/stats', { immediate: !isSeller.value })
const isOwner = computed(() => (user.value as any)?.role === 'OWNER')
const localePath = useLocalePath()
const { money } = useL()
const cards = computed(() => data.value ? [
  { label: t('admin.stats.products'), value: data.value.products, icon: 'i-lucide-package' },
  { label: t('admin.stats.published'), value: data.value.published, icon: 'i-lucide-badge-check' },
  { label: t('admin.stats.sections'), value: data.value.sections, icon: 'i-lucide-folder-tree' },
  { label: t('admin.stats.types'), value: data.value.types, icon: 'i-lucide-shapes' },
  { label: t('admin.stats.users'), value: data.value.users, icon: 'i-lucide-users' },
] : [])
// Marketplace work waiting for the store
const queue = computed(() => data.value ? [
  { label: t('admin.statsExtra.review'), value: data.value.inReview, icon: 'i-lucide-hourglass', to: '/admin/products?status=IN_REVIEW', show: true },
  { label: t('admin.statsExtra.sellers'), value: data.value.pendingSellers + data.value.proposals, icon: 'i-lucide-users', to: '/admin/sellers', show: isOwner.value },
  { label: t('admin.statsExtra.payouts'), value: data.value.payouts, icon: 'i-lucide-banknote', to: '/admin/payouts', show: isOwner.value },
  { label: t('admin.statsExtra.reports'), value: data.value.reports, icon: 'i-lucide-flag', to: '/admin/reports', show: true },
  { label: t('admin.statsExtra.reviews'), value: data.value.pendingReviews, icon: 'i-lucide-star', to: '/admin/reviews', show: true },
].filter(c => c.show) : [])
</script>

<template>
  <UDashboardPanel>
    <template #header><UDashboardNavbar :title="t('admin.dashboard')"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar></template>
    <template #body>
      <SellerDashboard v-if="isSeller" />
      <template v-else>
      <div class="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-4">
        <NuxtLink v-for="c in queue" :key="c.label" :to="localePath(c.to)">
          <UCard :class="c.value ? 'ring-2 ring-warning' : ''">
            <div class="flex items-center gap-3">
              <span class="grid place-items-center size-10 rounded-lg bg-warning/10 text-warning"><UIcon :name="c.icon" class="size-5" /></span>
              <div><p class="text-sm text-muted">{{ c.label }}</p><p class="text-2xl font-extrabold">{{ num(c.value) }}</p></div>
            </div>
          </UCard>
        </NuxtLink>
      </div>
      <div class="grid gap-4 sm:grid-cols-3 mb-4">
        <NuxtLink :to="localePath('/admin/requests')">
          <UCard :class="data?.newRequests ? 'ring-2 ring-primary' : ''">
            <div class="flex items-center gap-3">
              <span class="grid place-items-center size-10 rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-message-square-plus" class="size-5" /></span>
              <div><p class="text-sm text-muted">{{ t('admin.statsExtra.requests') }}</p><p class="text-2xl font-extrabold">{{ num(data?.newRequests ?? 0) }}</p></div>
            </div>
          </UCard>
        </NuxtLink>
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
    </template>
  </UDashboardPanel>
</template>
