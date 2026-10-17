<script setup lang="ts">
/** Everything the buyer owns, their purchases and their download history, with download-again buttons. */
definePageMeta({ middleware: 'auth' })
const { t } = useI18n()
const { l, num, bytes, date, money } = useL()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { data: items, refresh } = await useFetch<any[]>('/api/library')
const { data: orders } = await useFetch<any[]>('/api/orders')
const { data: history, refresh: refreshHistory } = await useFetch<any[]>('/api/library/downloads')
const { data: saved } = await useFetch<any[]>('/api/wishlist')
const wishlist = useWishlist()
onMounted(() => wishlist.load())
// A heart taken off here hides the card at once
const savedNow = computed(() => (saved.value ?? []).filter(p => wishlist.ids.value === null || wishlist.has(p.id)))
const tab = computed({
  get: () => String(route.query.tab ?? 'library'),
  set: v => router.replace({ query: v === 'library' ? {} : { tab: v } }),
})
const tabs = computed(() => [
  { label: t('library.tabs.library'), value: 'library', icon: 'i-lucide-library', badge: items.value?.length || undefined },
  { label: t('library.tabs.orders'), value: 'orders', icon: 'i-lucide-receipt' },
  { label: t('library.tabs.history'), value: 'history', icon: 'i-lucide-history' },
  { label: t('wishlist.title'), value: 'wishlist', icon: 'i-lucide-heart', badge: savedNow.value.length || undefined },
])
const busy = ref('')

async function download(productId: string, fileId: string) {
  busy.value = fileId
  try {
    const { url } = await $fetch<{ url: string }>(`/api/library/${productId}/link`, { method: 'POST', body: { fileId } })
    window.location.href = url
    setTimeout(() => { refresh(); refreshHistory() }, 1500)
  }
  catch (e: any) { toast.add({ title: apiError(e, t('library.limit')), color: 'error' }) }
  finally { busy.value = '' }
}
const itemFor = (slug: string) => items.value?.find(i => i.product.slug === slug)
useSeoMeta({ title: () => t('library.title'), robots: 'noindex' })
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <h1 class="text-2xl font-extrabold">{{ t('library.title') }}</h1>
    <UTabs v-model="tab" :items="tabs" :content="false" class="w-full sm:w-auto" />

    <template v-if="tab === 'library'">
      <UEmpty v-if="!items?.length" icon="i-lucide-library" :title="t('library.empty')" :actions="[{ label: t('cart.browse'), to: localePath('/search') }]" />
      <div v-else class="grid gap-4 md:grid-cols-2">
        <UCard v-for="item in items" :key="item.productId">
          <div class="flex gap-4">
            <NuxtLink :to="localePath(`/p/${item.product.slug}`)" class="size-20 shrink-0 rounded-lg bg-primary/10 grid place-items-center overflow-hidden">
              <img v-if="item.product.cover" :src="item.product.cover" alt="" class="size-full object-cover">
              <UIcon v-else name="i-lucide-layers" class="size-8 text-primary" />
            </NuxtLink>
            <div class="flex-1 min-w-0 space-y-1.5">
              <NuxtLink :to="localePath(`/p/${item.product.slug}`)" class="font-bold line-clamp-2 hover:text-primary">{{ l(item.product.title) }}</NuxtLink>
              <p class="text-xs text-muted">
                <NuxtLink v-if="item.orderNumber" :to="localePath(`/orders/${item.orderNumber}`)" class="hover:text-primary">{{ t('library.bought', { n: num(item.orderNumber) }) }}</NuxtLink>
                <span v-else>{{ t('library.free') }}</span>
                · {{ date(item.addedAt) }}
              </p>
              <p class="text-xs text-muted">
                {{ item.downloadLimit ? t('library.downloads', { used: num(item.downloadsUsed), limit: num(item.downloadLimit) }) : t('library.downloadsUnlimited', { used: num(item.downloadsUsed) }) }}
                <template v-if="item.lastDownloadedAt"> · {{ t('library.lastDownload', { d: date(item.lastDownloadedAt) }) }}</template>
              </p>
              <UBadge v-if="item.updatedSinceDownload" color="info" variant="soft" icon="i-lucide-sparkles">{{ t('library.updated') }}</UBadge>
            </div>
          </div>
          <div class="mt-4 space-y-2">
            <div v-for="f in item.files" :key="f.id" class="flex items-center gap-3 rounded-lg border border-default p-3">
              <UIcon name="i-lucide-file-archive" class="size-5 text-muted" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate" dir="ltr">{{ f.filename }}</p>
                <p class="text-xs text-muted">v{{ f.version }} · <span dir="ltr">{{ bytes(f.size) }}</span> · {{ date(f.updatedAt) }}</p>
              </div>
              <UButton icon="i-lucide-download" :loading="busy === f.id" :disabled="!!item.downloadLimit && item.downloadsUsed >= item.downloadLimit" :label="t('library.download')" @click="download(item.productId, f.id)" />
            </div>
          </div>
        </UCard>
      </div>
      <p v-if="items?.length" class="text-sm text-muted flex items-center gap-2"><UIcon name="i-lucide-info" />{{ t('library.howTo') }}</p>
    </template>

    <template v-else-if="tab === 'wishlist'">
      <UEmpty v-if="!savedNow.length" icon="i-lucide-heart" :title="t('wishlist.empty')" :actions="[{ label: t('cart.browse'), to: localePath('/search') }]" />
      <ProductGrid v-else :items="savedNow" />
    </template>

    <template v-else-if="tab === 'orders'">
      <UEmpty v-if="!orders?.length" icon="i-lucide-receipt" :title="t('order.none')" />
      <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
        <ul class="divide-y divide-default">
          <li v-for="o in orders" :key="o.number">
            <NuxtLink :to="localePath(`/orders/${o.number}`)" class="flex items-center gap-4 p-4 hover:bg-elevated/50">
              <div class="flex-1 min-w-0">
                <p class="font-bold">{{ t('order.title', { n: num(o.number) }) }}</p>
                <p class="text-sm text-muted truncate">{{ o.items.map((i: any) => l(i.title)).join('، ') }}</p>
              </div>
              <div class="text-end space-y-1">
                <OrderStatus :status="o.status" />
                <p class="text-sm text-muted">{{ money(o.total) }} · {{ date(o.createdAt) }}</p>
              </div>
            </NuxtLink>
          </li>
        </ul>
      </UCard>
    </template>

    <template v-else>
      <UEmpty v-if="!history?.length" icon="i-lucide-history" :title="t('library.noHistory')" />
      <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
        <ul class="divide-y divide-default">
          <li v-for="(h, i) in history" :key="i" class="flex items-center gap-4 p-4">
            <div class="flex-1 min-w-0">
              <NuxtLink :to="localePath(`/p/${h.product.slug}`)" class="font-medium line-clamp-1 hover:text-primary">{{ l(h.product.title) }}</NuxtLink>
              <p class="text-xs text-muted"><span dir="ltr">{{ h.file?.filename }}</span> · {{ date(h.at) }}</p>
            </div>
            <UButton
              v-if="itemFor(h.product.slug)?.files.length" size="sm" color="neutral" variant="outline" icon="i-lucide-download"
              :loading="busy === itemFor(h.product.slug).files[0].id" :label="t('library.download')"
              @click="download(itemFor(h.product.slug).productId, itemFor(h.product.slug).files[0].id)"
            />
          </li>
        </ul>
      </UCard>
    </template>
  </UContainer>
</template>
