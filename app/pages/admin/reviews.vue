<script setup lang="ts">
/** Staff moderate reviews; sellers answer reviews of their own products. */
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { l, date } = useL()
const localePath = useLocalePath()
const toast = useToast()
const filter = ref('all')
const page = ref(1)
const query = computed(() => ({
  page: page.value,
  ...(['published', 'pending', 'hidden'].includes(filter.value) ? { status: filter.value } : {}),
  ...(filter.value === 'unanswered' ? { unanswered: '1' } : {}),
}))
watch(filter, () => { page.value = 1 })
const { data, refresh } = await useFetch<any>('/api/admin/reviews', { query, watch: [query] })
const tabs = computed(() => [
  { label: t('review.filter.all'), value: 'all' },
  ...(data.value?.staff !== false ? ['pending', 'published', 'hidden'].map(s => ({ label: t(`review.status.${s}`), value: s })) : []),
  { label: t('review.filter.unanswered'), value: 'unanswered' },
])
const color = (s: string) => ({ published: 'success', pending: 'warning', hidden: 'neutral' } as const)[s] ?? 'neutral'

const replying = ref<string | null>(null)
const draft = ref('')
function startReply(r: any) { replying.value = r.id; draft.value = r.sellerReply ?? '' }

async function save(id: string, body: Record<string, unknown>) {
  try {
    await $fetch(`/api/admin/reviews/${id}`, { method: 'PUT', body })
    toast.add({ title: t('admin.saved'), color: 'success' })
    replying.value = null
    await refresh()
    refreshNuxtData('admin-stats')
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('admin.reviews')"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar>
      <UDashboardToolbar><UTabs v-model="filter" :items="tabs" :content="false" variant="link" size="sm" /></UDashboardToolbar>
    </template>
    <template #body>
      <div class="space-y-4">
        <UEmpty v-if="!data?.items.length" icon="i-lucide-star" :title="t('review.none')" class="py-10" />
        <UCard v-for="r in data?.items" :key="r.id">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <StarRating :value="r.rating" size="sm" />
              <span class="font-bold"><bdi>{{ r.name }}</bdi></span>
              <span v-if="r.contact" class="text-xs text-muted" dir="ltr">{{ r.contact }}</span>
              <UBadge v-if="data.staff" :color="color(r.status)" variant="soft" size="sm">{{ t(`review.status.${r.status}`) }}</UBadge>
              <span class="text-xs text-muted ms-auto">{{ date(r.createdAt) }}</span>
            </div>
            <NuxtLink :to="localePath(`/p/${r.product.slug}`)" target="_blank" class="text-sm text-primary hover:underline">{{ l(r.product.title) }}</NuxtLink>
            <!-- Plain text, saved through plainText() and shown with {{ }} -->
            <p v-if="r.body" class="whitespace-pre-line break-words" dir="auto">{{ r.body }}</p>

            <div v-if="r.sellerReply && replying !== r.id" class="rounded-lg bg-elevated p-3 text-sm">
              <p class="font-medium mb-1">{{ t('review.reply') }}</p>
              <p class="whitespace-pre-line break-words" dir="auto">{{ r.sellerReply }}</p>
            </div>
            <form v-if="replying === r.id" class="space-y-2" @submit.prevent="save(r.id, { reply: draft })">
              <UTextarea v-model="draft" :rows="3" autoresize maxlength="2000" class="w-full" :placeholder="t('review.replyPlaceholder')" />
              <div class="flex gap-2">
                <UButton type="submit" size="sm" :label="t('admin.save')" />
                <UButton v-if="r.sellerReply" size="sm" color="error" variant="ghost" :label="t('review.deleteReply')" @click="save(r.id, { reply: null })" />
                <UButton size="sm" color="neutral" variant="ghost" :label="t('admin.cancel')" @click="replying = null" />
              </div>
            </form>

            <div v-if="replying !== r.id" class="flex flex-wrap gap-2 pt-1">
              <UButton size="sm" variant="soft" icon="i-lucide-reply" :label="r.sellerReply ? t('review.editReply') : t('review.answer')" @click="startReply(r)" />
              <template v-if="data.staff">
                <UButton v-if="r.status !== 'published'" size="sm" color="success" variant="soft" icon="i-lucide-check" :label="t('review.publish')" @click="save(r.id, { status: 'published' })" />
                <UButton v-if="r.status !== 'hidden'" size="sm" color="neutral" variant="ghost" icon="i-lucide-eye-off" :label="t('review.hide')" @click="save(r.id, { status: 'hidden' })" />
              </template>
            </div>
          </div>
        </UCard>
        <div v-if="data && data.total > data.perPage" class="flex justify-center"><UPagination v-model:page="page" :total="data.total" :items-per-page="data.perPage" /></div>
      </div>
    </template>
  </UDashboardPanel>
</template>
