<script setup lang="ts">
import * as uiLocales from '@nuxt/ui/locale'

const { locale, locales } = useI18n()
const current = computed(() => locales.value.find(l => l.code === locale.value))
const uiLocale = computed(() => locale.value === 'fa' ? uiLocales.fa_ir : uiLocales.en)

useHead({
  htmlAttrs: { lang: () => current.value?.language ?? 'fa-IR', dir: () => current.value?.dir ?? 'rtl' },
})
</script>

<template>
  <UApp :locale="uiLocale">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
