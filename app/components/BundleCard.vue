<script setup lang="ts">
defineProps<{ bundle: any }>()
const { t } = useI18n()
const { l, money, num } = useL()
const localePath = useLocalePath()
</script>

<template>
  <NuxtLink :to="localePath(`/b/${bundle.slug}`)" class="group flex flex-col rounded-xl border border-default bg-elevated/40 overflow-hidden hover:border-primary hover:shadow-lg transition">
    <div class="grid grid-cols-3 gap-1 p-3 bg-gradient-to-br from-primary/15 to-primary/5">
      <div v-for="p in bundle.products.slice(0, 3)" :key="p.id" class="aspect-square rounded-lg bg-default grid place-items-center overflow-hidden">
        <img v-if="p.cover" :src="p.cover" alt="" class="size-full object-cover" loading="lazy">
        <UIcon v-else name="i-lucide-layers" class="size-7 text-primary" />
      </div>
    </div>
    <div class="flex flex-col gap-2 p-4 flex-1">
      <p class="text-xs text-muted flex items-center gap-1"><UIcon name="i-lucide-package-plus" />{{ t('bundle.items', { n: num(bundle.products.length) }) }}</p>
      <h3 class="font-bold leading-7 line-clamp-2">{{ l(bundle.title) }}</h3>
      <div class="mt-auto pt-2 flex items-center gap-2 flex-wrap">
        <span class="font-bold">{{ money(bundle.price) }}</span>
        <del class="text-sm text-muted">{{ money(bundle.listPrice) }}</del>
        <UBadge color="success" variant="soft" size="sm">{{ t('bundle.save', { amount: money(bundle.saving) }) }}</UBadge>
      </div>
    </div>
  </NuxtLink>
</template>
