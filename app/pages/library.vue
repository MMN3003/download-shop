<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { t } = useI18n()
const { l, num, bytes, date } = useL()
const localePath = useLocalePath()
const toast = useToast()
const { data: items, refresh } = await useFetch<any[]>('/api/library')
const busy = ref('')

async function download(item: any, file: any) {
  busy.value = file.id
  try {
    const { url } = await $fetch<{ url: string }>(`/api/library/${item.productId}/link`, { method: 'POST', body: { fileId: file.id } })
    window.location.href = url
    setTimeout(refresh, 1500)
  }
  catch (e: any) { toast.add({ title: apiError(e, t('library.limit')), color: 'error' }) }
  finally { busy.value = '' }
}
useSeoMeta({ title: () => t('library.title'), robots: 'noindex' })
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <h1 class="text-2xl font-extrabold">{{ t('library.title') }}</h1>
    <UEmpty v-if="!items?.length" icon="i-lucide-library" :title="t('library.empty')" :actions="[{ label: t('cart.browse'), to: localePath('/search') }]" />
    <div v-else class="grid gap-4 md:grid-cols-2">
      <UCard v-for="item in items" :key="item.productId">
        <div class="flex gap-4">
          <NuxtLink :to="localePath(`/p/${item.product.slug}`)" class="size-20 shrink-0 rounded-lg bg-primary/10 grid place-items-center overflow-hidden">
            <img v-if="item.product.cover" :src="item.product.cover" alt="" class="size-full object-cover">
            <UIcon v-else name="i-lucide-layers" class="size-8 text-primary" />
          </NuxtLink>
          <div class="flex-1 min-w-0 space-y-2">
            <NuxtLink :to="localePath(`/p/${item.product.slug}`)" class="font-bold line-clamp-2 hover:text-primary">{{ l(item.product.title) }}</NuxtLink>
            <UBadge v-if="item.updatedSinceDownload" color="info" variant="soft" icon="i-lucide-sparkles">{{ t('library.updated') }}</UBadge>
            <p class="text-xs text-muted">{{ item.downloadLimit ? t('library.downloads', { used: num(item.downloadsUsed), limit: num(item.downloadLimit) }) : t('library.downloadsUnlimited', { used: num(item.downloadsUsed) }) }}</p>
          </div>
        </div>
        <div class="mt-4 space-y-2">
          <div v-for="f in item.files" :key="f.id" class="flex items-center gap-3 rounded-lg border border-default p-3">
            <UIcon name="i-lucide-file-archive" class="size-5 text-muted" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate" dir="ltr">{{ f.filename }}</p>
              <p class="text-xs text-muted">v{{ f.version }} · <span dir="ltr">{{ bytes(f.size) }}</span> · {{ date(f.updatedAt) }}</p>
            </div>
            <UButton icon="i-lucide-download" :loading="busy === f.id" :disabled="!!item.downloadLimit && item.downloadsUsed >= item.downloadLimit" :label="t('library.download')" @click="download(item, f)" />
          </div>
        </div>
      </UCard>
    </div>
    <p v-if="items?.length" class="text-sm text-muted flex items-center gap-2"><UIcon name="i-lucide-info" />{{ t('library.howTo') }}</p>
  </UContainer>
</template>
