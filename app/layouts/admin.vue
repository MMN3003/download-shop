<script setup lang="ts">
const { t, locale, locales, setLocale } = useI18n()
const localePath = useLocalePath()
const { clear } = useUserSession()

const items = computed(() => [[
  { label: t('admin.dashboard'), icon: 'i-lucide-gauge', to: localePath('/admin'), exact: true },
  { label: t('admin.products'), icon: 'i-lucide-package', to: localePath('/admin/products') },
  { label: t('admin.sections'), icon: 'i-lucide-folder-tree', to: localePath('/admin/sections') },
  { label: t('admin.types'), icon: 'i-lucide-shapes', to: localePath('/admin/types') },
  { label: t('admin.lists'), icon: 'i-lucide-list', to: localePath('/admin/lists') },
  { label: t('admin.settings'), icon: 'i-lucide-settings', to: localePath('/admin/settings') },
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
          <span v-if="!collapsed">{{ t('admin.title') }}</span>
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
