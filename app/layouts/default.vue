<script setup lang="ts">
const { data: store } = await useStore()
const { l } = useL()
const { t, locale, locales, setLocale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { loggedIn, user, clear } = useUserSession()
const cart = useCart()
const userMenu = computed(() => [[
  { label: (user.value as any)?.name, type: 'label' as const },
], [
  { label: t('nav.library'), icon: 'i-lucide-library', to: localePath('/library') },
  { label: t('nav.orders'), icon: 'i-lucide-receipt', to: localePath('/orders') },
  { label: t('nav.requests'), icon: 'i-lucide-message-square-plus', to: localePath('/requests') },
  { label: t('nav.account'), icon: 'i-lucide-user', to: localePath('/account') },
  ...(isAdmin.value ? [{ label: t('nav.admin'), icon: 'i-lucide-layout-dashboard', to: localePath('/admin') }] : []),
  (user.value as any)?.role === 'SELLER'
    ? { label: t('seller.panel'), icon: 'i-lucide-store', to: localePath('/admin') }
    : { label: t('nav.sell'), icon: 'i-lucide-store', to: localePath('/sell') },
], [
  { label: t('nav.logout'), icon: 'i-lucide-log-out', onSelect: logout },
]])
async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo(localePath('/'))
}

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
        <UChip :text="cart.count.value" :show="cart.count.value > 0" size="3xl" inset>
          <UButton color="neutral" variant="ghost" icon="i-lucide-shopping-cart" :to="localePath('/cart')" :aria-label="t('nav.cart')" />
        </UChip>
        <UDropdownMenu v-if="loggedIn" :items="userMenu">
          <UButton color="neutral" variant="ghost" icon="i-lucide-circle-user" :aria-label="t('nav.account')" />
        </UDropdownMenu>
        <UButton v-else color="neutral" variant="ghost" icon="i-lucide-log-in" :to="localePath('/login')" :aria-label="t('nav.login')" />
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
        <UButton color="neutral" variant="link" size="sm" icon="i-lucide-message-square-plus" :label="t('nav.requests')" :to="localePath('/requests')" />
        <UButton color="neutral" variant="link" size="sm" icon="i-lucide-store" :label="t('nav.sell')" :to="localePath('/sell')" />
        <UButton v-if="store?.settings.social.instagram" icon="i-lucide-instagram" color="neutral" variant="ghost" :to="store.settings.social.instagram" target="_blank" aria-label="Instagram" />
        <UButton v-if="store?.settings.social.telegram" icon="i-lucide-send" color="neutral" variant="ghost" :to="store.settings.social.telegram" target="_blank" aria-label="Telegram" />

      </template>
    </UFooter>
  </div>
</template>
