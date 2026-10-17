<script setup lang="ts">
const { t, locale, locales, setLocale } = useI18n()
const localePath = useLocalePath()
const { clear, user } = useUserSession()
const role = computed(() => (user.value as any)?.role)
// Currency label and store name for money formatting on every admin page
await useStore()
const isSeller = computed(() => role.value === 'SELLER')
// Sellers have no access to store-wide numbers
const { data: stats } = await useFetch<any>('/api/admin/stats', { key: 'admin-stats', immediate: !isSeller.value })

const sellerItems = computed(() => [
  { label: t('admin.dashboard'), icon: 'i-lucide-gauge', to: localePath('/admin'), exact: true },
  { label: t('admin.products'), icon: 'i-lucide-package', to: localePath('/admin/products') },
  { label: t('seller.earnings'), icon: 'i-lucide-wallet', to: localePath('/admin/earnings') },
  { label: t('seller.commission'), icon: 'i-lucide-percent', to: localePath('/admin/commission') },
  { label: t('seller.shop'), icon: 'i-lucide-store', to: localePath('/admin/shop') },
  { label: t('admin.reviews'), icon: 'i-lucide-star', to: localePath('/admin/reviews') },
])

const items = computed(() => [isSeller.value ? sellerItems.value : [
  { label: t('admin.dashboard'), icon: 'i-lucide-gauge', to: localePath('/admin'), exact: true },
  { label: t('admin.orders'), icon: 'i-lucide-receipt', to: localePath('/admin/orders'), badge: stats.value?.pendingReceipts || undefined },
  { label: t('admin.requests'), icon: 'i-lucide-message-square-plus', to: localePath('/admin/requests'), badge: stats.value?.newRequests || undefined },
  // Support staff only handle orders; catalog and settings are for owner/editors
  ...(['OWNER', 'EDITOR'].includes(role.value) ? [
    { label: t('admin.products'), icon: 'i-lucide-package', to: localePath('/admin/products') },
    { label: t('admin.sections'), icon: 'i-lucide-folder-tree', to: localePath('/admin/sections') },
    { label: t('admin.types'), icon: 'i-lucide-shapes', to: localePath('/admin/types') },
    { label: t('admin.lists'), icon: 'i-lucide-list', to: localePath('/admin/lists') },
    { label: t('admin.coupons'), icon: 'i-lucide-ticket-percent', to: localePath('/admin/coupons') },
    { label: t('admin.bundles'), icon: 'i-lucide-package-plus', to: localePath('/admin/bundles') },
    { label: t('admin.blog'), icon: 'i-lucide-newspaper', to: localePath('/admin/blog') },
    { label: t('admin.home'), icon: 'i-lucide-layout-template', to: localePath('/admin/home') },
  ] : []),
  { label: t('admin.reviews'), icon: 'i-lucide-star', to: localePath('/admin/reviews'), badge: stats.value?.pendingReviews || undefined },
  { label: t('admin.reports'), icon: 'i-lucide-flag', to: localePath('/admin/reports'), badge: stats.value?.reports || undefined },
  ...(role.value === 'OWNER' ? [
    { label: t('admin.sellers'), icon: 'i-lucide-users', to: localePath('/admin/sellers'), badge: (stats.value?.pendingSellers + stats.value?.proposals) || undefined },
    { label: t('admin.payouts'), icon: 'i-lucide-banknote', to: localePath('/admin/payouts'), badge: stats.value?.payouts || undefined },
    { label: t('admin.sales'), icon: 'i-lucide-chart-line', to: localePath('/admin/sales') },
    { label: t('admin.settings'), icon: 'i-lucide-settings', to: localePath('/admin/settings') },
  ] : []),
], [
  { label: t('admin.viewStore'), icon: 'i-lucide-store', to: localePath('/'), target: '_blank' },
]])
const other = computed(() => locales.value.find(x => x.code !== locale.value)!)

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  navigateTo(localePath('/admin/login'))
}
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible resizable :default-size="16">
      <template #header="{ collapsed }">
        <span class="flex items-center gap-2 font-extrabold">
          <span class="grid place-items-center size-8 rounded-lg bg-primary text-inverted"><UIcon name="i-lucide-layout-dashboard" /></span>
          <span v-if="!collapsed">{{ isSeller ? t('seller.panel') : t('admin.title') }}</span>
        </span>
      </template>
      <template #default="{ collapsed }">
        <UNavigationMenu :collapsed="collapsed" :items="items[0]" orientation="vertical" />
        <UNavigationMenu :collapsed="collapsed" :items="items[1]" orientation="vertical" class="mt-auto" />
      </template>
      <template #footer="{ collapsed }">
        <div class="flex flex-col gap-1 w-full">
          <UButton :label="collapsed ? undefined : other.name" icon="i-lucide-languages" color="neutral" variant="ghost" block @click="setLocale(other.code)" />
          <UButton :label="collapsed ? undefined : t('nav.logout')" icon="i-lucide-log-out" color="neutral" variant="ghost" block @click="logout" />
        </div>
      </template>
    </UDashboardSidebar>
    <slot />
  </UDashboardGroup>
</template>
