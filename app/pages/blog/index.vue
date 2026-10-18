<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const page = computed(() => Number(route.query.page) || 1)
const tag = computed(() => (route.query.tag as string) || undefined)
const { data } = await useFetch<any>('/api/blog', { query: { page, tag } })
useSeoMeta({ title: () => tag.value ? `${t('blog.title')}: ${tag.value}` : t('blog.title') })
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h1 class="text-2xl font-extrabold">{{ t('blog.title') }}</h1>
      <UBadge v-if="tag" color="neutral" variant="soft" size="lg">
        <bdi>{{ tag }}</bdi>
        <UButton icon="i-lucide-x" size="xs" variant="link" color="neutral" :aria-label="t('catalog.clear')" @click="router.replace({ query: {} })" />
      </UBadge>
    </div>
    <UEmpty v-if="!data?.items.length" icon="i-lucide-newspaper" :title="t('blog.none')" />
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <BlogCard v-for="p in data.items" :key="p.id" :post="p" />
    </div>
    <div v-if="data && data.total > data.perPage" class="flex justify-center">
      <UPagination :page="page" :total="data.total" :items-per-page="data.perPage" @update:page="p => router.replace({ query: { ...route.query, page: String(p) } })" />
    </div>
  </UContainer>
</template>
