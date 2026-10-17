<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { l, date } = useL()
const localePath = useLocalePath()
const { data: posts } = await useFetch<any[]>('/api/admin/blog')
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('admin.blog')">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UButton icon="i-lucide-plus" :label="t('blog.new')" :to="localePath('/admin/blog/new')" /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UEmpty v-if="!posts?.length" icon="i-lucide-newspaper" :title="t('blog.none')" class="py-10" />
      <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
        <ul class="divide-y divide-default">
          <li v-for="p in posts" :key="p.id">
            <NuxtLink :to="localePath(`/admin/blog/${p.id}`)" class="flex items-center gap-3 px-4 py-3 hover:bg-elevated/50">
              <span class="size-12 shrink-0 rounded-lg bg-primary/10 grid place-items-center overflow-hidden">
                <img v-if="p.cover" :src="p.cover" alt="" class="size-full object-cover">
                <UIcon v-else name="i-lucide-newspaper" class="size-5 text-primary" />
              </span>
              <span class="flex-1 min-w-0">
                <span class="block font-medium truncate">{{ l(p.title) }}</span>
                <span class="block text-xs text-muted">{{ date(p.publishedAt || p.updatedAt) }}<template v-if="p.author"> · <bdi>{{ p.author }}</bdi></template></span>
              </span>
              <UBadge :color="p.status === 'published' ? 'success' : 'neutral'" variant="soft" size="sm">{{ t(`blog.status.${p.status}`) }}</UBadge>
            </NuxtLink>
          </li>
        </ul>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
