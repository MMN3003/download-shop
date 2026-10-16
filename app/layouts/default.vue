<script setup lang="ts">
const { data: store } = await useStore()
const { l } = useL()
const { t, locale, locales, setLocale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { loggedIn, user } = useUserSession()

const q = ref(String(route.query.q ?? ''))
function search() {
  navigateTo({ path: localePath('/search'), query: q.value ? { q: q.value } : {} })
}

const tree = computed(() => buildSectionTree(store.value?.sections ?? []).roots)
const navItems = computed(() => tree.value.map(s => ({
  label: l(s.name),
  icon: s.icon || undefined,
  to: localePath(`/s/${s.slug}`),
  children: s.children.length ? s.children.map((c: any) => ({ label: l(c.name), icon: c.icon || undefined, to: localePath(`/s/${c.slug}`) })) : undefined,
})))
const isAdmin = computed(() => ['OWNER', 'EDITOR', 'SUPPORT'].includes((user.value as any)?.role))
const otherLocale = computed(() => locales.value.find(x => x.code !== locale.value)!)

useSeoMeta({ titleTemplate: s => (s ? `${s} | ` : '') + l(store.value?.settings.storeName) })
</script>

<template>
  <div class="min-h-screen flex flex-col bg-default">
    <UHeader :to="localePath('/')" :title="l(store?.settings.storeName)">
      <template #title>
        <span class="flex items-center gap-2 font-extrabold text-lg">
          <img v-if="store?.settings.logo" :src="store.settings.logo" alt="" class="h-8 w-8 rounded-lg">
          <span v-else class="grid place-items-center h-8 w-8 rounded-lg bg-primary text-inverted"><UIcon name="i-lucide-download" /></span>
          {{ l(store?.settings.storeName) }}
        </span>
      </template>

      <UNavigationMenu :items="navItems" class="hidden lg:flex" />

      <template #right>
        <form class="hidden md:block" @submit.prevent="search">
          <UInput v-model="q" icon="i-lucide-search" :placeholder="t('nav.searchPlaceholder')" class="w-56" />
        </form>
        <UButton color="neutral" variant="ghost" :label="otherLocale.code.toUpperCase()" :aria-label="t('nav.language')" @click="setLocale(otherLocale.code)" />
        <UColorModeButton />
        <UButton v-if="isAdmin" color="neutral" variant="ghost" icon="i-lucide-layout-dashboard" :to="localePath('/admin')" :aria-label="t('nav.admin')" />
      </template>

      <template #body>
        <form class="mb-4" @submit.prevent="search">
          <UInput v-model="q" icon="i-lucide-search" :placeholder="t('nav.searchPlaceholder')" class="w-full" />
        </form>
        <UNavigationMenu :items="navItems" orientation="vertical" class="-mx-2.5" />
      </template>
    </UHeader>

    <UMain class="flex-1">
      <slot />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">© {{ new Date().getFullYear() }} {{ l(store?.settings.storeName) }}. {{ t('footer.rights') }}</p>
      </template>
      <template #right>
        <UButton v-if="store?.settings.social.instagram" icon="i-lucide-instagram" color="neutral" variant="ghost" :to="store.settings.social.instagram" target="_blank" aria-label="Instagram" />
        <UButton v-if="store?.settings.social.telegram" icon="i-lucide-send" color="neutral" variant="ghost" :to="store.settings.social.telegram" target="_blank" aria-label="Telegram" />
        <UButton v-if="!loggedIn" color="neutral" variant="link" size="sm" :label="t('nav.login')" :to="localePath('/admin/login')" />
      </template>
    </UFooter>
  </div>
</template>
