<script setup lang="ts">
const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { data: section, error } = await useFetch(() => `/api/sections/${encodeURIComponent(slug.value)}`)
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })
const { l } = useL()
const { t } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
  title: () => l(section.value?.seoTitle) || l(section.value?.name),
  description: () => l(section.value?.seoDesc) || l(section.value?.description),
})
const crumbs = computed(() => [
  { label: t('nav.home'), to: localePath('/'), icon: 'i-lucide-house' },
  ...(section.value?.trail ?? []).map(s => ({ label: l(s.name), to: localePath(`/s/${s.slug}`) })),
])
</script>

<template>
  <UContainer v-if="section" class="py-8 space-y-6">
    <UBreadcrumb :items="crumbs" />
    <div class="rounded-2xl p-6 md:p-8 bg-gradient-to-l from-primary/15 to-primary/5 bg-cover bg-center" :style="section.banner ? { backgroundImage: `url(${section.banner})` } : {}">
      <div class="flex items-center gap-3">
        <UIcon v-if="section.icon" :name="section.icon" class="size-8 text-primary" />
        <h1 class="text-2xl md:text-3xl font-extrabold">{{ l(section.name) }}</h1>
      </div>
      <p v-if="l(section.description)" class="mt-2 text-muted max-w-2xl">{{ l(section.description) }}</p>
      <div v-if="section.children.length" class="mt-4 flex flex-wrap gap-2">
        <UButton v-for="c in section.children" :key="c.slug" :to="localePath(`/s/${c.slug}`)" :label="l(c.name)" :icon="c.icon || undefined" color="neutral" variant="outline" size="sm" />
      </div>
    </div>
    <CatalogView :section="section.slug" />
  </UContainer>
</template>
