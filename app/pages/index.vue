<script setup lang="ts">
const { data: store } = await useStore()
const { data: home } = await useFetch('/api/home')
const { l, num } = useL()
const { t } = useI18n()
const localePath = useLocalePath()
const heroQ = ref('')

useSeoMeta({ title: '', description: () => l(store.value?.settings.tagline) })

const rows = computed(() => [
  { key: 'featured', title: t('home.featured'), items: home.value?.featured ?? [], to: '/search' },
  { key: 'newest', title: t('home.newest'), items: home.value?.newest ?? [], to: '/search?sort=new' },
  { key: 'popular', title: t('home.popular'), items: home.value?.popular ?? [], to: '/search?sort=popular' },
  { key: 'free', title: t('home.free'), items: home.value?.free ?? [], to: '/search?free=1' },
].filter(r => r.items.length))
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
      <section v-if="home?.sections.length">
        <h2 class="text-xl font-extrabold mb-4">{{ t('home.browseSections') }}</h2>
        <div class="grid gap-3 grid-cols-2 md:grid-cols-4">
          <NuxtLink v-for="s in home.sections" :key="s.slug" :to="localePath(`/s/${s.slug}`)" class="flex items-center gap-3 rounded-xl border border-default p-4 hover:border-primary hover:bg-primary/5 transition">
            <span class="grid place-items-center size-11 rounded-lg bg-primary/10 text-primary"><UIcon :name="s.icon || 'i-lucide-folder'" class="size-6" /></span>
            <span>
              <span class="block font-bold">{{ l(s.name) }}</span>
              <span class="text-xs text-muted">{{ t('catalog.results', { n: num(s.count) }) }}</span>
            </span>
          </NuxtLink>
        </div>
      </section>

      <section v-for="row in rows" :key="row.key">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-extrabold">{{ row.title }}</h2>
          <UButton variant="link" :label="t('home.seeAll')" :to="localePath(row.to)" trailing-icon="i-lucide-arrow-left" class="ltr:[&_svg]:rotate-180" />
        </div>
        <ProductGrid :items="row.items" />
      </section>

      <UEmpty v-if="!rows.length" icon="i-lucide-package-open" :title="t('home.empty')" />

      <section class="rounded-2xl bg-elevated p-6 md:p-10">
        <h2 class="text-xl font-extrabold mb-6 text-center">{{ t('home.howTitle') }}</h2>
        <div class="grid gap-6 md:grid-cols-3 text-center">
          <div v-for="(step, i) in [t('home.how1'), t('home.how2'), t('home.how3')]" :key="i">
            <span class="mx-auto grid place-items-center size-12 rounded-full bg-primary text-inverted font-bold text-lg">{{ num(i + 1) }}</span>
            <p class="mt-3 font-medium">{{ step }}</p>
          </div>
        </div>
      </section>
    </UContainer>
  </div>
</template>
