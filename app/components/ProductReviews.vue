<script setup lang="ts">
const props = defineProps<{ slug: string }>()
const { t } = useI18n()
const { num, date } = useL()
const toast = useToast()
const page = ref(1)
const { data, refresh } = await useFetch<any>(() => `/api/products/${encodeURIComponent(props.slug)}/reviews`, { query: { page }, watch: [page] })
const form = reactive({ rating: 0, body: '' })
const editing = ref(false)
watch(() => data.value?.mine, (m) => { if (m) Object.assign(form, { rating: m.rating, body: m.body ?? '' }) }, { immediate: true })
const busy = ref(false)
async function save() {
  busy.value = true
  try {
    const r = await $fetch<any>(`/api/products/${encodeURIComponent(props.slug)}/reviews`, { method: 'POST', body: form })
    toast.add({ title: r.status === 'pending' ? t('review.pending') : t('review.saved'), color: 'success' })
    editing.value = false
    await refresh()
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
  finally { busy.value = false }
}
async function remove() {
  if (!confirm(t('review.confirmDelete'))) return
  await $fetch(`/api/products/${encodeURIComponent(props.slug)}/reviews`, { method: 'DELETE' })
  Object.assign(form, { rating: 0, body: '' })
  await refresh()
}
const pct = (n: number) => data.value?.count ? Math.round(n / data.value.count * 100) : 0
</script>

<template>
  <section v-if="data" id="reviews" class="space-y-5">
    <h2 class="text-lg font-bold flex items-center gap-2"><UIcon name="i-lucide-message-square-quote" />{{ t('review.title') }}</h2>
    <div v-if="data.count" class="grid gap-6 sm:grid-cols-[12rem_1fr] items-center rounded-xl border border-default p-5">
      <div class="text-center">
        <p class="text-4xl font-extrabold">{{ num(data.avg) }}</p>
        <StarRating :value="data.avg" />
        <p class="text-sm text-muted mt-1">{{ t('review.count', { n: num(data.count) }) }}</p>
      </div>
      <ul class="space-y-1 text-sm">
        <li v-for="s in data.spread" :key="s.rating" class="flex items-center gap-2">
          <span class="w-4 text-end">{{ num(s.rating) }}</span><UIcon name="i-lucide-star" class="text-warning size-3.5" />
          <UProgress :model-value="pct(s.count)" size="sm" class="flex-1" />
          <span class="w-8 text-muted">{{ num(s.count) }}</span>
        </li>
      </ul>
    </div>

    <UCard v-if="data.canReview && (!data.mine || editing)">
      <form class="space-y-3" @submit.prevent="save">
        <p class="font-medium">{{ data.mine ? t('review.edit') : t('review.write') }}</p>
        <StarRating v-model="form.rating" pick />
        <UTextarea v-model="form.body" :rows="3" maxlength="2000" autoresize :placeholder="t('review.bodyPh')" class="w-full" />
        <div class="flex gap-2">
          <UButton type="submit" icon="i-lucide-send" :loading="busy" :disabled="!form.rating" :label="t('review.send')" />
          <UButton v-if="editing" color="neutral" variant="ghost" :label="t('admin.cancel')" @click="editing = false" />
        </div>
      </form>
    </UCard>
    <UCard v-if="data.mine && !editing" :ui="{ root: 'ring-primary/40' }">
      <div class="flex items-start gap-3">
        <div class="flex-1 space-y-1">
          <p class="text-sm font-medium flex items-center gap-2">{{ t('review.yours') }} <StarRating :value="data.mine.rating" /></p>
          <p v-if="data.mine.body" class="whitespace-pre-line break-words" dir="auto">{{ data.mine.body }}</p>
          <UBadge v-if="data.mine.status !== 'published'" color="warning" variant="soft" size="sm">{{ t(`review.status.${data.mine.status}`) }}</UBadge>
        </div>
        <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-pencil" :aria-label="t('admin.edit')" @click="editing = true" />
        <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash" :aria-label="t('admin.delete')" @click="remove" />
      </div>
    </UCard>
    <p v-else-if="!data.canReview && !data.count" class="text-sm text-muted">{{ t('review.none') }}</p>

    <ul class="divide-y divide-default">
      <li v-for="r in data.items" :key="r.id" class="py-4 space-y-2">
        <div class="flex items-center gap-2 text-sm">
          <StarRating :value="r.rating" />
          <span class="font-medium">{{ r.name || t('review.buyer') }}</span>
          <UBadge color="success" variant="soft" size="sm" icon="i-lucide-badge-check">{{ t('review.verified') }}</UBadge>
          <span class="text-muted text-xs">{{ date(r.createdAt) }}</span>
        </div>
        <p v-if="r.body" class="whitespace-pre-line break-words leading-7" dir="auto">{{ r.body }}</p>
        <div v-if="r.sellerReply" class="ms-4 border-s-2 border-primary ps-3 text-sm">
          <p class="font-medium text-primary">{{ t('review.sellerReply') }}</p>
          <p class="whitespace-pre-line break-words" dir="auto">{{ r.sellerReply }}</p>
        </div>
      </li>
    </ul>
    <div v-if="data.count > data.perPage" class="flex justify-center"><UPagination v-model:page="page" :total="data.count" :items-per-page="data.perPage" /></div>
  </section>
</template>
