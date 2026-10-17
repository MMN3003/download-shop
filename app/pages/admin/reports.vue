<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { l, date } = useL()
const localePath = useLocalePath()
const toast = useToast()
const { user } = useUserSession()
const canHide = computed(() => ['OWNER', 'EDITOR'].includes((user.value as any)?.role))
const status = ref('open')
const query = computed(() => ({ status: status.value }))
const { data, refresh } = await useFetch<any[]>('/api/admin/reports', { query, watch: [query] })
const tabs = computed(() => ['open', 'resolved', 'dismissed'].map(s => ({ label: t(`report.status.${s}`), value: s })))

async function set(id: string, next: string, hideProduct = false) {
  try {
    await $fetch(`/api/admin/reports/${id}`, { method: 'PUT', body: { status: next, hideProduct } })
    toast.add({ title: t('admin.saved'), color: 'success' })
    await refresh()
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('admin.reports')"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar>
      <UDashboardToolbar><UTabs v-model="status" :items="tabs" :content="false" variant="link" size="sm" /></UDashboardToolbar>
    </template>
    <template #body>
      <UEmpty v-if="!data?.length" icon="i-lucide-flag" :title="t('catalog.noResults')" class="py-10" />
      <UCard v-for="r in data" :key="r.id">
        <div class="flex flex-wrap items-start gap-3">
          <div class="flex-1 min-w-48 space-y-1">
            <p class="font-bold">
              <NuxtLink :to="localePath(`/admin/products/${r.product.id}`)" class="underline">{{ l(r.product.title) }}</NuxtLink>
              <span v-if="r.product.seller" class="text-muted font-normal"> · {{ r.product.seller.displayName }}</span>
            </p>
            <p class="text-sm"><UBadge color="error" variant="soft" size="sm">{{ t(`report.reasons.${r.reason}`) }}</UBadge> <span class="text-muted text-xs">{{ date(r.createdAt) }}</span></p>
            <p class="whitespace-pre-line break-words text-sm" dir="auto">{{ r.details }}</p>
            <p class="text-xs text-muted" dir="ltr">{{ r.contact || r.user?.email || r.user?.phone }}</p>
          </div>
          <div v-if="r.status === 'open'" class="flex flex-wrap gap-2">
            <UButton v-if="canHide && r.product.status === 'PUBLISHED'" size="sm" color="error" icon="i-lucide-eye-off" :label="t('report.hide')" @click="set(r.id, 'resolved', true)" />
            <UButton size="sm" color="success" variant="soft" icon="i-lucide-check" :label="t('report.resolve')" @click="set(r.id, 'resolved')" />
            <UButton size="sm" color="neutral" variant="ghost" :label="t('report.dismiss')" @click="set(r.id, 'dismissed')" />
          </div>
          <UButton v-else size="sm" color="neutral" variant="ghost" icon="i-lucide-undo-2" :label="t('report.reopen')" @click="set(r.id, 'open')" />
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
