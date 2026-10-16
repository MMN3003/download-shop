<script setup lang="ts">
const { t, locale } = useI18n()
const { l, money } = useL()
const localePath = useLocalePath()
const toast = useToast()
const cart = useCart()
const { loggedIn } = useUserSession()

const { data: quote, refresh } = await useFetch('/api/cart/quote', { method: 'POST', body: computed(() => ({ ids: cart.ids.value })), watch: [cart.ids] })
const { data: methods } = await useFetch<any[]>('/api/checkout/methods')
const method = ref<string>('')
watchEffect(() => { if (!method.value && methods.value?.length) method.value = methods.value[0].key })

// Drop products that are no longer for sale
watch(quote, (q) => {
  if (!q) return
  const live = new Set(q.items.map(i => i.id))
  for (const id of cart.ids.value) if (!live.has(id)) cart.remove(id)
}, { immediate: true })

const busy = ref(false)
async function checkout() {
  if (!loggedIn.value) return navigateTo({ path: localePath('/login'), query: { redirect: localePath('/cart') } })
  busy.value = true
  try {
    const r = await $fetch<any>('/api/checkout', { method: 'POST', body: { ids: cart.ids.value, method: quote.value!.total > 0 ? method.value : undefined, locale: locale.value } })
    cart.clear()
    if (r.error) toast.add({ title: r.error, color: 'error' })
    if (/^https?:\/\//.test(r.next)) window.location.href = r.next
    else await navigateTo(r.next)
  }
  catch (e: any) {
    toast.add({ title: apiError(e), color: 'error' })
    await refresh()
  }
  finally { busy.value = false }
}
useSeoMeta({ title: () => t('cart.title'), robots: 'noindex' })
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <h1 class="text-2xl font-extrabold">{{ t('cart.title') }}</h1>
    <UEmpty v-if="!quote?.items.length" icon="i-lucide-shopping-cart" :title="t('cart.empty')" :actions="[{ label: t('cart.browse'), to: localePath('/search') }]" />
    <div v-else class="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <ul class="divide-y divide-default">
          <li v-for="item in quote.items" :key="item.id" class="flex items-center gap-4 p-4">
            <NuxtLink :to="localePath(`/p/${item.slug}`)" class="size-16 shrink-0 rounded-lg bg-primary/10 grid place-items-center overflow-hidden">
              <img v-if="item.cover" :src="item.cover" alt="" class="size-full object-cover">
              <UIcon v-else name="i-lucide-layers" class="size-7 text-primary" />
            </NuxtLink>
            <div class="flex-1 min-w-0">
              <NuxtLink :to="localePath(`/p/${item.slug}`)" class="font-bold line-clamp-2 hover:text-primary">{{ l(item.title) }}</NuxtLink>
              <p v-if="item.owned" class="text-sm text-success">{{ t('cart.owned') }}</p>
            </div>
            <PriceTag v-if="!item.owned" :price="item.price" :final-price="item.finalPrice" :is-free="item.isFree" />
            <UButton icon="i-lucide-trash" color="neutral" variant="ghost" :aria-label="t('cart.remove')" @click="cart.remove(item.id)" />
          </li>
        </ul>
      </UCard>

      <UCard class="self-start lg:sticky lg:top-24">
        <div class="space-y-4">
          <div class="flex justify-between text-lg font-extrabold">
            <span>{{ t('cart.total') }}</span><span>{{ money(quote.total) }}</span>
          </div>
          <template v-if="quote.total > 0">
            <p class="font-medium">{{ t('cart.method') }}</p>
            <UAlert v-if="!methods?.length" color="warning" variant="soft" :title="t('cart.noMethods')" />
            <URadioGroup
              v-else v-model="method" variant="card" indicator="end"
              :items="methods.map(m => ({ value: m.key, label: l(m.name), icon: m.icon }))"
            >
              <template #label="{ item }"><span class="inline-flex items-center gap-2"><UIcon :name="(item as any).icon" class="size-5" />{{ (item as any).label }}</span></template>
            </URadioGroup>
          </template>
          <UButton
            block size="xl" :loading="busy" :disabled="quote.total > 0 && !methods?.length"
            :icon="loggedIn ? 'i-lucide-lock' : 'i-lucide-log-in'"
            :label="!loggedIn ? t('cart.loginToPay') : quote.total > 0 ? t('cart.pay', { amount: money(quote.total) }) : t('cart.getFree')"
            @click="checkout"
          />
          <UButton block variant="link" color="neutral" :label="t('cart.continue')" :to="localePath('/search')" />
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
