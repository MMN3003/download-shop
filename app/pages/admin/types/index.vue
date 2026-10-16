<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { l, num } = useL()
const localePath = useLocalePath()
const { data: types } = await useFetch<any[]>('/api/admin/product-types')
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('admin.types')">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UButton icon="i-lucide-plus" :label="t('admin.add')" :to="localePath('/admin/types/new')" /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NuxtLink v-for="ty in types" :key="ty.id" :to="localePath(`/admin/types/${ty.id}`)">
          <UCard class="hover:ring-primary h-full">
            <div class="flex items-start gap-3">
              <span class="grid place-items-center size-10 rounded-lg bg-primary/10 text-primary"><UIcon :name="ty.icon || 'i-lucide-box'" class="size-5" /></span>
              <div class="flex-1">
                <p class="font-bold">{{ l(ty.name) }}</p>
                <p class="text-xs text-muted" dir="ltr">{{ ty.key }}</p>
                <div class="mt-2 flex flex-wrap gap-1">
                  <UBadge v-if="ty.plugin" color="primary" variant="soft" size="sm" icon="i-lucide-sparkles">{{ ty.plugin }}</UBadge>
                  <UBadge color="neutral" variant="soft" size="sm">{{ t('admin.type.fields') }}: {{ num(ty.attributes.length) }}</UBadge>
                  <UBadge color="neutral" variant="soft" size="sm">{{ t('admin.type.products') }}: {{ num(ty._count.products) }}</UBadge>
                  <UBadge v-if="!ty.enabled" color="warning" variant="soft" size="sm">off</UBadge>
                </div>
              </div>
            </div>
          </UCard>
        </NuxtLink>
      </div>
    </template>
  </UDashboardPanel>
</template>
