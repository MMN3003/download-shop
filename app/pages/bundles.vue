<script setup lang="ts">
const { data } = await useFetch<any[]>('/api/bundles')
const { t } = useI18n()
useSeoMeta({ title: () => t('bundle.all') })
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <h1 class="text-2xl font-extrabold">{{ t('bundle.all') }}</h1>
    <UEmpty v-if="!data?.length" icon="i-lucide-package-plus" :title="t('bundle.none')" />
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <BundleCard v-for="b in data" :key="b.id" :bundle="b" />
    </div>
  </UContainer>
</template>
