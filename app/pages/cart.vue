<script setup lang="ts">
const { t, locale } = useI18n()
const { l, money, num } = useL()
const localePath = useLocalePath()
const toast = useToast()
const cart = useCart()
const { loggedIn } = useUserSession()

const coupon = useCookie<string | null>('cart-coupon', { default: () => null, sameSite: 'lax' })
const codeInput = ref(coupon.value ?? '')
const { data: quote, refresh } = await useFetch('/api/cart/quote', { method: 'POST', body: computed(() => ({ ids: cart.ids.value, coupon: coupon.value })), watch: [cart.ids, coupon] })
const couponMessage = (code: string, min = 0) => t(`coupon.err.${code}`, { min: money(min) })
function applyCoupon() { coupon.value = codeInput.value.trim() || null }
function removeCoupon() { coupon.value = null; codeInput.value = '' }
const { data: methods } = await useFetch<any[]>('/api/checkout/methods')
const method = ref<string>('')
/** Installment methods take only orders above their minimum. */
const tooSmall = (m: any) => !!m.info?.minAmount && (quote.value?.total ?? 0) < Number(m.info.minAmount)
const methodItems = computed(() => (methods.value ?? []).map(m => ({
  value: m.key, label: l(m.name), icon: m.icon, disabled: tooSmall(m),
  description: m.info?.installments ? (tooSmall(m) ? t('cart.installmentsMin', { min: money(Number(m.info.minAmount)) }) : t('cart.installments', { n: num(Number(m.info.installments)) })) : undefined,
})))
watchEffect(() => {
  const usable = methodItems.value.filter(m => !m.disabled)
  if (usable.length && !usable.some(m => m.value === method.value)) method.value = usable[0]!.value
})

// Drop products that are no longer for sale
watch(quote, (q) => {
  if (!q) return
  const live = new Set([...q.items.map(i => i.id), ...q.bundles.map(b => b.key)])
  for (const id of cart.ids.value) if (!live.has(id)) cart.remove(id)
}, { immediate: true })

const busy = ref(false)
async function checkout() {
  if (!loggedIn.value) return navigateTo({ path: localePath('/login'), query: { redirect: localePath('/cart') } })
  busy.value = true
  try {
    const r = await $fetch<any>('/api/checkout', { method: 'POST', body: { ids: cart.ids.value, coupon: coupon.value, method: quote.value!.total > 0 ? method.value : undefined, locale: locale.value } })
    cart.clear()
    coupon.value = null
    if (r.error) toast.add({ title: r.error, color: 'error' })
    if (/^https?:\/\//.test(r.next)) window.location.href = r.next
    else await navigateTo(r.next)
  }
  catch (e: any) {
    const c = e?.data?.data?.coupon
    toast.add({ title: c ? couponMessage(c, e.data.data.min) : apiError(e), color: 'error' })
    await refresh()
  }
  finally { busy.value = false }
}
useSeoMeta({ title: () => t('cart.title'), robots: 'noindex' })
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <h1 class="text-2xl font-extrabold">{{ t('cart.title') }}</h1>
    <UEmpty v-if="!quote?.items.length && !quote?.bundles.length" icon="i-lucide-shopping-cart" :title="t('cart.empty')" :actions="[{ label: t('cart.browse'), to: localePath('/search') }]" />
    <div v-else class="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <ul class="divide-y divide-default">
          <li v-for="b in quote.bundles" :key="b.key" class="p-4 space-y-3">
            <div class="flex items-center gap-4">
              <NuxtLink :to="localePath(`/b/${b.slug}`)" class="size-16 shrink-0 rounded-lg bg-primary/10 grid place-items-center overflow-hidden">
                <img v-if="b.cover" :src="b.cover" alt="" class="size-full object-cover">
                <UIcon v-else name="i-lucide-package-plus" class="size-7 text-primary" />
              </NuxtLink>
              <div class="flex-1 min-w-0">
                <UBadge variant="soft" size="sm" :label="t('bundle.label')" />
                <NuxtLink :to="localePath(`/b/${b.slug}`)" class="block font-bold line-clamp-2 hover:text-primary">{{ l(b.title) }}</NuxtLink>
                <p v-if="b.owned" class="text-sm text-success">{{ t('cart.owned') }}</p>
              </div>
              <div v-if="!b.owned" class="text-end">
                <p class="font-bold">{{ money(b.price) }}</p>
                <del class="text-sm text-muted">{{ money(b.listPrice) }}</del>
              </div>
              <UButton icon="i-lucide-trash" color="neutral" variant="ghost" :aria-label="t('cart.remove')" @click="cart.remove(b.key)" />
            </div>
            <ul class="ps-20 text-sm text-muted space-y-1">
              <li v-for="p in b.products" :key="p.id" class="flex items-center gap-2">
                <UIcon :name="p.owned ? 'i-lucide-check' : 'i-lucide-dot'" :class="p.owned && 'text-success'" />
                <span class="line-clamp-1">{{ l(p.title) }}</span>
                <span v-if="p.owned" class="text-success">({{ t('cart.owned') }})</span>
              </li>
            </ul>
          </li>
          <li v-for="item in quote.items" :key="item.id" class="flex items-center gap-4 p-4">
            <NuxtLink :to="localePath(`/p/${item.slug}`)" class="size-16 shrink-0 rounded-lg bg-primary/10 grid place-items-center overflow-hidden">
              <img v-if="item.cover" :src="item.cover" alt="" class="size-full object-cover">
              <UIcon v-else name="i-lucide-layers" class="size-7 text-primary" />
            </NuxtLink>
            <div class="flex-1 min-w-0">
              <NuxtLink :to="localePath(`/p/${item.slug}`)" class="font-bold line-clamp-2 hover:text-primary">{{ l(item.title) }}</NuxtLink>
              <p v-if="item.owned" class="text-sm text-success">{{ t('cart.owned') }}</p>
              <p v-else-if="item.inBundle" class="text-sm text-muted">{{ t('cart.inBundle') }}</p>
            </div>
            <PriceTag v-if="!item.owned && !item.inBundle" :price="item.price" :final-price="item.finalPrice" :is-free="item.isFree" />
            <UButton icon="i-lucide-trash" color="neutral" variant="ghost" :aria-label="t('cart.remove')" @click="cart.remove(item.id)" />
          </li>
        </ul>
      </UCard>

      <UCard class="self-start lg:sticky lg:top-24">
        <div class="space-y-4">
          <form v-if="!quote.coupon" class="flex gap-2" @submit.prevent="applyCoupon">
            <UInput v-model="codeInput" :placeholder="t('coupon.placeholder')" icon="i-lucide-ticket-percent" class="flex-1" maxlength="40" dir="ltr" />
            <UButton type="submit" color="neutral" variant="outline" :label="t('coupon.apply')" :disabled="!codeInput.trim()" />
          </form>
          <UAlert v-if="quote.couponError" color="error" variant="soft" :title="couponMessage(quote.couponError, quote.couponMin)" :actions="[{ label: t('coupon.remove'), color: 'neutral', variant: 'link', onClick: removeCoupon }]" />
          <template v-if="quote.discount > 0">
            <div class="flex justify-between text-muted">
              <span>{{ t('cart.subtotal') }}</span><span>{{ money(quote.subtotal) }}</span>
            </div>
            <div class="flex justify-between text-success">
              <span>{{ t('cart.saving') }}</span><span>− {{ money(quote.discount) }}</span>
            </div>
          </template>
          <div v-if="quote.coupon" class="flex items-center justify-between gap-2 text-sm">
            <span class="inline-flex items-center gap-1"><UIcon name="i-lucide-ticket-percent" class="text-success" />{{ t('coupon.applied') }} <bdi dir="ltr" class="font-mono">{{ quote.coupon.code }}</bdi></span>
            <UButton size="xs" color="neutral" variant="link" :label="t('coupon.remove')" @click="removeCoupon" />
          </div>
          <div class="flex justify-between text-lg font-extrabold">
            <span>{{ t('cart.total') }}</span><span>{{ money(quote.total) }}</span>
          </div>
          <template v-if="quote.total > 0">
            <p class="font-medium">{{ t('cart.method') }}</p>
            <UAlert v-if="!methods?.length" color="warning" variant="soft" :title="t('cart.noMethods')" />
            <URadioGroup
              v-else v-model="method" variant="card" indicator="end"
              :items="methodItems"
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
