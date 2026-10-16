<script setup lang="ts">
const route = useRoute()
const { data, error } = await useFetch(() => `/api/products/${encodeURIComponent(String(route.params.slug))}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 500, statusMessage: error.value.statusMessage, fatal: true })
const { l, date, bytes } = useL()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const toast = useToast()

const p = computed(() => data.value!.product)
const details = computed(() => p.value.productType.attributes
  .filter(a => a.key !== 'subdecks')
  .map(a => ({ ...a, value: p.value.attributes[a.key] }))
  .filter(a => a.value != null && a.value !== '' && a.value !== false && a.value !== 0 && !(Array.isArray(a.value) && !(a.value as unknown[]).length)))
const subdecks = computed(() => String(p.value.attributes.subdecks ?? '').split('\n').filter(Boolean))
const learn = computed(() => ((p.value.learnPoints as any)?.[locale.value] ?? (p.value.learnPoints as any)?.fa ?? []) as string[])
const mainFile = computed(() => p.value.files.find(f => f.kind === 'MAIN'))
const crumbs = computed(() => [
  { label: t('nav.home'), to: localePath('/'), icon: 'i-lucide-house' },
  ...p.value.sections.slice(0, 1).map(s => ({ label: l(s.name), to: localePath(`/s/${s.slug}`) })),
  { label: l(p.value.title) },
])

useSeoMeta({
  title: () => l(p.value.seoTitle) || l(p.value.title),
  description: () => l(p.value.seoDesc) || l(p.value.shortDesc),
  ogImage: () => p.value.cover ?? undefined,
})
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: () => JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Product', name: l(p.value.title), description: l(p.value.shortDesc), image: p.value.cover ?? undefined,
      offers: { '@type': 'Offer', price: p.value.finalPrice, priceCurrency: 'IRR', availability: 'https://schema.org/InStock' },
    }),
  }],
})

function buy() {
  toast.add({ title: t('product.buySoon'), icon: 'i-lucide-clock' })
}
</script>

<template>
  <UContainer v-if="data" class="py-8 pb-24 lg:pb-8 space-y-10">
    <UBreadcrumb :items="crumbs" />

    <div class="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div class="space-y-8 min-w-0">
        <div>
          <UBadge color="primary" variant="soft" class="mb-3">{{ l(p.productType.name) }}</UBadge>
          <h1 class="text-2xl md:text-3xl font-extrabold leading-relaxed">{{ l(p.title) }}</h1>
          <p v-if="l(p.shortDesc)" class="mt-2 text-lg text-muted">{{ l(p.shortDesc) }}</p>
        </div>

        <section v-if="p.previews.length" class="space-y-3">
          <h2 class="text-lg font-bold flex items-center gap-2"><UIcon name="i-lucide-eye" />{{ t('product.preview') }}</h2>
          <ProductPreviews :previews="p.previews" />
        </section>
        <img v-else-if="p.cover" :src="p.cover" :alt="l(p.title)" class="rounded-xl w-full">

        <section v-if="learn.length" class="rounded-xl border border-default p-5">
          <h2 class="text-lg font-bold mb-3">{{ t('product.learn') }}</h2>
          <ul class="grid gap-2 sm:grid-cols-2">
            <li v-for="x in learn" :key="x" class="flex gap-2"><UIcon name="i-lucide-check" class="text-success mt-1 shrink-0" />{{ x }}</li>
          </ul>
        </section>

        <section v-if="l(p.description)">
          <h2 class="text-lg font-bold mb-3">{{ t('product.description') }}</h2>
          <!-- Sanitised on save (server/utils/product-input.ts) -->
          <div class="prose dark:prose-invert max-w-none leading-8" v-html="l(p.description)" />
        </section>

        <section v-if="subdecks.length">
          <h2 class="text-lg font-bold mb-3">{{ t('product.contents') }}</h2>
          <ul class="space-y-1">
            <li v-for="d in subdecks" :key="d" class="flex items-center gap-2 text-sm" :style="{ paddingInlineStart: `${(d.split('::').length - 1) * 1.25}rem` }">
              <UIcon name="i-lucide-folder" class="text-primary" />{{ d.split('::').pop() }}
            </li>
          </ul>
        </section>

        <div v-if="p.screenshots.length" class="grid gap-3 grid-cols-2 md:grid-cols-3">
          <img v-for="s in p.screenshots" :key="s!" :src="s!" alt="" class="rounded-lg border border-default">
        </div>
      </div>

      <aside class="lg:sticky lg:top-24 self-start space-y-4">
        <UCard>
          <div class="space-y-4">
            <PriceTag :price="p.price" :final-price="p.finalPrice" :is-free="p.isFree" size="lg" />
            <UButton block size="xl" icon="i-lucide-shopping-cart" :label="t('product.buy')" @click="buy" />
            <USeparator />
            <dl class="space-y-2 text-sm">
              <div v-for="a in details" :key="a.key" class="flex justify-between gap-4">
                <dt class="text-muted">{{ l(a.name) }}</dt>
                <dd class="font-medium text-end"><AttrValue :def="a" :value="a.value" /></dd>
              </div>
              <div v-if="mainFile" class="flex justify-between gap-4">
                <dt class="text-muted">{{ t('product.version') }}</dt><dd class="font-medium">{{ mainFile.version }}</dd>
              </div>
              <div v-if="mainFile" class="flex justify-between gap-4">
                <dt class="text-muted">{{ t('product.size') }}</dt><dd class="font-medium" dir="ltr">{{ bytes(mainFile.size) }}</dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-muted">{{ t('product.updated') }}</dt><dd class="font-medium">{{ date(p.updatedAt) }}</dd>
              </div>
              <div v-if="p.seller" class="flex justify-between gap-4">
                <dt class="text-muted">{{ t('product.seller') }}</dt><dd class="font-medium">{{ p.seller.displayName }}</dd>
              </div>
            </dl>
          </div>
        </UCard>
        <div v-if="p.tags.length" class="flex flex-wrap gap-1">
          <UBadge v-for="tag in p.tags" :key="tag" color="neutral" variant="outline" size="sm">#{{ tag }}</UBadge>
        </div>
      </aside>
    </div>

    <!-- Mobile: keep price and buy button in reach -->
    <div class="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-default bg-default/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
      <PriceTag :price="p.price" :final-price="p.finalPrice" :is-free="p.isFree" />
      <UButton icon="i-lucide-shopping-cart" :label="t('product.buy')" @click="buy" />
    </div>

    <section v-if="data.related.length">
      <h2 class="text-xl font-extrabold mb-4">{{ t('product.related') }}</h2>
      <ProductGrid :items="data.related" />
    </section>
  </UContainer>
</template>
