<script setup lang="ts">
const route = useRoute()
const { data: b, error } = await useFetch<any>(() => `/api/bundles/${encodeURIComponent(String(route.params.slug))}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 500, statusMessage: error.value.statusMessage, fatal: true })
const { t } = useI18n()
const { l, money, num } = useL()
const localePath = useLocalePath()
const cart = useCart()
const inCart = computed(() => !!b.value && cart.has(b.value.key))
function add() {
  if (!b.value) return
  if (!inCart.value) cart.add(b.value.key)
  navigateTo(localePath('/cart'))
}
useSeoMeta({ title: () => l(b.value?.title), ogImage: () => b.value?.cover })
</script>

<template>
  <UContainer v-if="b" class="py-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
    <div class="space-y-6">
      <div>
        <UBadge variant="soft" :label="t('bundle.label')" icon="i-lucide-package-plus" />
        <h1 class="mt-2 text-2xl md:text-3xl font-extrabold leading-snug">{{ l(b.title) }}</h1>
        <p class="text-muted mt-1">{{ t('bundle.items', { n: num(b.products.length) }) }}</p>
      </div>
      <!-- Sanitised on save (server/utils/bundle-input.ts) -->
      <div v-if="l(b.description)" class="prose dark:prose-invert max-w-none leading-8" v-html="l(b.description)" />
      <ProductGrid :items="b.products" />
    </div>
    <UCard class="self-start lg:sticky lg:top-24">
      <div class="space-y-3">
        <div class="flex justify-between text-muted"><span>{{ t('bundle.separately') }}</span><del>{{ money(b.listPrice) }}</del></div>
        <div class="flex justify-between text-success"><span>{{ t('cart.saving') }}</span><span>{{ money(b.saving) }}</span></div>
        <div class="flex justify-between text-xl font-extrabold"><span>{{ t('bundle.price') }}</span><span>{{ money(b.price) }}</span></div>
        <UButton block size="xl" icon="i-lucide-shopping-cart" :label="inCart ? t('bundle.inCart') : t('bundle.add')" @click="add" />
        <p class="text-xs text-muted">{{ t('bundle.ownedNote') }}</p>
      </div>
    </UCard>
  </UContainer>
</template>
