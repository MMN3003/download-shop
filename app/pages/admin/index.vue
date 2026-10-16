<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { num, date } = useL()
const { data } = await useFetch('/api/admin/stats')
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
