<script setup lang="ts">
const { data: store } = await useStore()
const { data: home } = await useFetch('/api/home')
const { l, num } = useL()
const { t } = useI18n()
const localePath = useLocalePath()
const heroQ = ref('')

useSeoMeta({ title: '', description: () => l(store.value?.settings.tagline) })

const defaults: Record<string, { title: string, to?: string }> = {
  featured: { title: t('home.featured'), to: '/search' },
  newest: { title: t('home.newest'), to: '/search?sort=new' },
  popular: { title: t('home.popular'), to: '/search?sort=popular' },
  free: { title: t('home.free'), to: '/search?free=1' },
  sections: { title: t('home.browseSections') },
  bundles: { title: t('home.bundles'), to: '/bundles' },
  blog: { title: t('home.blog'), to: '/blog' },
  how: { title: t('home.howTitle') },
}

/** Blocks with nothing to show are dropped, so an empty store doesn't show empty headings. */
const blocks = computed(() => (home.value?.blocks ?? []).map((b: any) => ({
  ...b,
  heading: l(b.title) || defaults[b.type]?.title || '',
  to: b.type === 'section' ? `/s/${b.slug}` : defaults[b.type]?.to,
})).filter((b: any) => {
  if (b.items) return b.items.length > 0
  if (b.sections) return b.sections.length > 0
  if (b.bundles) return b.bundles.length > 0
  if (b.posts) return b.posts.length > 0
  if (b.type === 'banner') return !!b.image
  return b.type === 'how'
}))
const hasProducts = computed(() => blocks.value.some((b: any) => b.items?.length))

/** Banner links are checked on save (a /path or https://); only local paths go through the locale. */
const bannerLink = (link: string | null) => link?.startsWith('/') ? localePath(link) : link || undefined
</script>

<template>
  <div>
    <UPageHero :title="l(store?.settings.storeName)" :description="l(store?.settings.tagline)" class="bg-gradient-to-b from-primary/10 to-transparent">
      <template #links>
        <form class="w-full max-w-xl mx-auto" @submit.prevent="navigateTo({ path: localePath('/search'), query: heroQ ? { q: heroQ } : {} })">
          <UInput v-model="heroQ" size="xl" icon="i-lucide-search" :placeholder="t('nav.searchPlaceholder')" class="w-full" />
        </form>
      </template>
    </UPageHero>

    <UContainer class="space-y-14 pb-16">
      <UEmpty v-if="!hasProducts" icon="i-lucide-package-open" :title="t('home.empty')" />

      <template v-for="b in blocks" :key="b.id">
        <section v-if="b.type === 'banner'">
          <component :is="b.link ? 'a' : 'div'" :href="bannerLink(b.link)" :rel="b.link?.startsWith('http') ? 'noopener' : undefined" class="block rounded-2xl overflow-hidden">
            <img :src="b.image" :alt="b.heading" class="w-full max-h-80 object-cover" loading="lazy">
          </component>
        </section>

        <section v-else-if="b.type === 'how'" class="rounded-2xl bg-elevated p-6 md:p-10">
          <h2 class="text-xl font-extrabold mb-6 text-center">{{ b.heading }}</h2>
          <div class="grid gap-6 md:grid-cols-3 text-center">
            <div v-for="(step, i) in [t('home.how1'), t('home.how2'), t('home.how3')]" :key="i">
              <span class="mx-auto grid place-items-center size-12 rounded-full bg-primary text-inverted font-bold text-lg">{{ num(i + 1) }}</span>
              <p class="mt-3 font-medium">{{ step }}</p>
            </div>
          </div>
        </section>

        <section v-else>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-extrabold">{{ b.heading }}</h2>
            <UButton v-if="b.to" variant="link" :label="t('home.seeAll')" :to="localePath(b.to)" trailing-icon="i-lucide-arrow-left" class="ltr:[&_svg]:rotate-180" />
          </div>

          <div v-if="b.sections" class="grid gap-3 grid-cols-2 md:grid-cols-4">
            <NuxtLink v-for="s in b.sections" :key="s.slug" :to="localePath(`/s/${s.slug}`)" class="flex items-center gap-3 rounded-xl border border-default p-4 hover:border-primary hover:bg-primary/5 transition">
              <span class="grid place-items-center size-11 rounded-lg bg-primary/10 text-primary"><UIcon :name="s.icon || 'i-lucide-folder'" class="size-6" /></span>
              <span>
                <span class="block font-bold">{{ l(s.name) }}</span>
                <span class="text-xs text-muted">{{ t('catalog.results', { n: num(s.count) }) }}</span>
              </span>
            </NuxtLink>
          </div>
          <div v-else-if="b.bundles" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <BundleCard v-for="x in b.bundles" :key="x.id" :bundle="x" />
          </div>
          <div v-else-if="b.posts" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <BlogCard v-for="x in b.posts" :key="x.id" :post="x" />
          </div>
          <ProductGrid v-else :items="b.items" />
        </section>
      </template>
    </UContainer>
  </div>
</template>
