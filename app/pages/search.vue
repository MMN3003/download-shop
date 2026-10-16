<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()
useSeoMeta({ title: () => route.query.q ? `${t('nav.search')}: ${route.query.q}` : t('nav.search'), robots: 'noindex' })
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <h1 class="text-2xl font-extrabold">
      {{ t('nav.search') }}<span v-if="route.query.q">: «{{ route.query.q }}»</span>
    </h1>
    <CatalogView />
  </UContainer>
</template>
