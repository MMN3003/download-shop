<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { t } = useI18n()
const { num } = useL()
const localePath = useLocalePath()
const toast = useToast()
const { fetch: refreshSession } = useUserSession()
const { data, refresh } = await useFetch<any>('/api/seller/me')

const form = reactive({ displayName: '', slug: '', bio: '', terms: false, percent: null as number | null, note: '' })
const slugTouched = ref(false)
watch(() => form.displayName, (v) => { if (!slugTouched.value) form.slug = slugify(v) })
const busy = ref(false)

async function apply() {
  busy.value = true
  try {
    await $fetch('/api/seller/apply', { method: 'POST', body: { ...form, percent: form.percent === null || String(form.percent) === '' ? null : Number(form.percent) } })
    toast.add({ title: t('seller.applied'), color: 'success' })
    await refresh()
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
  finally { busy.value = false }
}
// Approval changes the role in the session; pick it up before opening the panel
async function openPanel() {
  // Called from the browser so the refreshed session cookie reaches it
  await $fetch('/api/seller/me')
  await refreshSession()
  await navigateTo(localePath('/admin'))
}
const steps = computed(() => [
  { icon: 'i-lucide-user-plus', title: t('seller.how.apply'), text: t('seller.how.applyText') },
  { icon: 'i-lucide-upload', title: t('seller.how.upload'), text: t('seller.how.uploadText') },
  { icon: 'i-lucide-wallet', title: t('seller.how.earn'), text: t('seller.how.earnText', { n: num(data.value?.defaultPercent ?? 25) }) },
])
useSeoMeta({ title: () => t('nav.sell') })
</script>

<template>
  <UContainer class="py-8 max-w-3xl space-y-8">
    <div>
      <h1 class="text-2xl font-extrabold">{{ t('seller.title') }}</h1>
      <p class="text-muted mt-2">{{ t('seller.intro') }}</p>
    </div>
    <div class="grid gap-4 sm:grid-cols-3">
      <UCard v-for="s in steps" :key="s.title">
        <UIcon :name="s.icon" class="size-6 text-primary" />
        <p class="font-bold mt-2">{{ s.title }}</p>
        <p class="text-sm text-muted mt-1">{{ s.text }}</p>
      </UCard>
    </div>

    <UCard v-if="data?.seller && data.seller.status !== 'rejected'">
      <div class="flex flex-wrap items-center gap-3">
        <p class="font-bold flex-1">{{ data.seller.displayName }}</p>
        <SellerStatus :status="data.seller.status" />
      </div>
      <p class="text-sm text-muted mt-3">{{ t(`seller.statusText.${data.seller.status}`) }}</p>
      <p v-if="data.seller.reviewNote" class="text-sm mt-2 whitespace-pre-line" dir="auto">{{ data.seller.reviewNote }}</p>
      <UButton v-if="data.seller.status === 'approved'" class="mt-4" icon="i-lucide-store" :label="t('seller.openPanel')" @click="openPanel" />
    </UCard>

    <UAlert v-else-if="!data?.sellersOpen" color="neutral" icon="i-lucide-lock" :title="t('seller.closed')" />

    <UCard v-else>
      <template #header><h2 class="font-bold">{{ t('seller.apply') }}</h2></template>
      <UAlert v-if="data?.seller?.status === 'rejected'" class="mb-4" color="error" variant="soft" icon="i-lucide-circle-x" :title="t('seller.statusText.rejected')" :description="data.seller.reviewNote || undefined" />
      <form class="space-y-4" @submit.prevent="apply">
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField :label="t('seller.displayName')" required><UInput v-model="form.displayName" maxlength="80" required class="w-full" /></UFormField>
          <UFormField :label="t('seller.slug')" :help="`/seller/${form.slug || '…'}`" required><UInput v-model="form.slug" dir="ltr" maxlength="100" required class="w-full" @input="slugTouched = true" /></UFormField>
        </div>
        <UFormField :label="t('seller.bio')" :help="t('request.plainNote')"><UTextarea v-model="form.bio" :rows="3" maxlength="1000" autoresize class="w-full" /></UFormField>
        <div class="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <UFormField :label="t('seller.proposePercent')" :help="t('seller.defaultIs', { n: num(data?.defaultPercent ?? 25) })"><UInput v-model="form.percent" type="number" min="0" max="100" step="0.5" dir="ltr" class="w-full" /></UFormField>
          <UFormField :label="t('seller.proposeNote')"><UInput v-model="form.note" maxlength="1000" class="w-full" /></UFormField>
        </div>
        <UCheckbox v-model="form.terms" :label="t('seller.terms')" :description="t('seller.termsText')" required />
        <UButton type="submit" icon="i-lucide-send" :loading="busy" :disabled="!form.terms || form.displayName.trim().length < 2 || !form.slug" :label="t('seller.send')" />
      </form>
    </UCard>
  </UContainer>
</template>
