<script setup lang="ts">
const route = useRoute()
const { data, error } = await useFetch(() => `/api/sellers/${encodeURIComponent(String(route.params.slug))}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 500, statusMessage: error.value.statusMessage, fatal: true })
const { t } = useI18n()
const { num, date } = useL()
const localePath = useLocalePath()
useSeoMeta({ title: () => data.value?.seller.displayName, description: () => data.value?.seller.bio ?? undefined })
</script>

<template>
  <UContainer v-if="data" class="py-8 space-y-6">
    <UBreadcrumb :items="[{ label: t('nav.home'), to: localePath('/'), icon: 'i-lucide-house' }, { label: data.seller.displayName }]" />
    <div class="rounded-2xl p-6 md:p-8 bg-gradient-to-l from-primary/15 to-primary/5 flex flex-wrap items-center gap-5">
      <UAvatar :src="data.seller.avatar ?? undefined" :alt="data.seller.displayName" size="3xl" />
      <div class="flex-1 min-w-0">
        <h1 class="text-2xl md:text-3xl font-extrabold break-words">{{ data.seller.displayName }}</h1>
        <p class="text-sm text-muted mt-1 flex flex-wrap gap-x-2"><bdi>{{ t('seller.public.since', { date: date(data.seller.since) }) }}</bdi><span>·</span><bdi>{{ t('seller.public.products', { n: num(data.products.length) }) }}</bdi></p>
        <p v-if="data.seller.bio" class="mt-3 max-w-2xl whitespace-pre-line break-words" dir="auto">{{ data.seller.bio }}</p>
      </div>
    </div>
    <ProductGrid v-if="data.products.length" :items="data.products" />
    <UEmpty v-else icon="i-lucide-package-open" :title="t('catalog.noResults')" />
  </UContainer>
</template>
