<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const toast = useToast()
const { data: s } = await useFetch<any>('/api/admin/settings')
const form = ref<any>(s.value ? { ...s.value } : {})
const { data: lists } = await useFetch<any[]>('/api/admin/option-lists')
const { l } = useL()
const saving = ref(false)

async function save() {
  saving.value = true
  const { logoUrl: _l, ...body } = form.value
  try {
    await $fetch('/api/admin/settings', { method: 'PUT', body: { ...body, defaultCommissionPercent: Number(body.defaultCommissionPercent), downloadLimit: Number(body.downloadLimit), requests: { ...body.requests, perDay: Number(body.requests.perDay) }, marketplace: { ...body.marketplace, payoutHoldDays: Number(body.marketplace.payoutHoldDays), minPayout: Number(body.marketplace.minPayout) } } })
    await refreshNuxtData('store')
    toast.add({ title: t('admin.saved'), color: 'success' })
  }
  catch (e: any) {
    toast.add({ title: t('admin.error'), description: apiError(e), color: 'error' })
  }
  finally { saving.value = false }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('admin.settings')">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UButton icon="i-lucide-save" :loading="saving" :label="t('admin.save')" @click="save" /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UCard class="max-w-3xl">
        <div class="space-y-5">
          <UFormField :label="t('admin.settingsPage.storeName')" required><AdminLocalizedInput v-model="form.storeName" /></UFormField>
          <UFormField :label="t('admin.settingsPage.tagline')"><AdminLocalizedInput v-model="form.tagline" /></UFormField>
          <UFormField :label="t('admin.settingsPage.logo')"><AdminImageUpload v-model="form.logo" :url="form.logoUrl" /></UFormField>
          <div class="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <UFormField :label="t('admin.settingsPage.currency')"><UInput v-model="form.currency" dir="ltr" class="w-full" /></UFormField>
            <UFormField :label="t('admin.settingsPage.currencyLabel')"><AdminLocalizedInput v-model="form.currencyLabel" /></UFormField>
          </div>
          <UFormField :label="t('admin.settingsPage.commission')" :help="t('admin.settingsPage.commissionHint')">
            <UInput v-model.number="form.defaultCommissionPercent" type="number" min="0" max="100" dir="ltr" class="w-40" />
          </UFormField>
          <UFormField :label="t('admin.settingsPage.social')">
            <div class="grid gap-2 sm:grid-cols-2">
              <UInput v-model="form.social.instagram" dir="ltr" placeholder="https://instagram.com/…" icon="i-lucide-instagram" />
              <UInput v-model="form.social.telegram" dir="ltr" placeholder="https://t.me/…" icon="i-lucide-send" />
            </div>
          </UFormField>
        </div>
      </UCard>

      <UCard class="max-w-3xl">
        <template #header><h2 class="font-bold">{{ t('admin.settingsPage.payments') }}</h2></template>
        <div class="space-y-6">
          <div class="space-y-3">
            <USwitch v-model="form.payments.zarinpal.enabled" :label="t('admin.settingsPage.zarinpal')" />
            <div v-if="form.payments.zarinpal.enabled" class="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
              <UFormField :label="t('admin.settingsPage.merchantId')"><UInput v-model="form.payments.zarinpal.merchantId" dir="ltr" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" class="w-full" /></UFormField>
              <USwitch v-model="form.payments.zarinpal.sandbox" :label="t('admin.settingsPage.sandbox')" />
            </div>
          </div>
          <USeparator />
          <div class="space-y-3">
            <USwitch v-model="form.payments.card.enabled" :label="t('admin.settingsPage.card')" />
            <div v-if="form.payments.card.enabled" class="grid gap-3 sm:grid-cols-3">
              <UFormField :label="t('admin.settingsPage.cardNumber')"><UInput v-model="form.payments.card.cardNumber" dir="ltr" inputmode="numeric" class="w-full" /></UFormField>
              <UFormField :label="t('admin.settingsPage.holder')"><UInput v-model="form.payments.card.holder" class="w-full" /></UFormField>
              <UFormField :label="t('admin.settingsPage.bank')"><UInput v-model="form.payments.card.bank" class="w-full" /></UFormField>
            </div>
          </div>
          <USeparator />
          <div class="space-y-3">
            <USwitch v-model="form.payments.iban.enabled" :label="t('admin.settingsPage.iban')" />
            <div v-if="form.payments.iban.enabled" class="grid gap-3 sm:grid-cols-3">
              <UFormField :label="t('admin.settingsPage.sheba')"><UInput v-model="form.payments.iban.sheba" dir="ltr" placeholder="IR…" class="w-full" /></UFormField>
              <UFormField :label="t('admin.settingsPage.holder')"><UInput v-model="form.payments.iban.holder" class="w-full" /></UFormField>
              <UFormField :label="t('admin.settingsPage.bank')"><UInput v-model="form.payments.iban.bank" class="w-full" /></UFormField>
            </div>
          </div>
          <USeparator />
          <UFormField :label="t('admin.settingsPage.downloadLimit')" :help="t('admin.settingsPage.downloadLimitHint')">
            <UInput v-model.number="form.downloadLimit" type="number" min="0" dir="ltr" class="w-32" />
          </UFormField>
        </div>
      </UCard>

      <UCard class="max-w-3xl">
        <template #header><h2 class="font-bold">{{ t('admin.settingsPage.requests') }}</h2></template>
        <div class="space-y-4">
          <USwitch v-model="form.requests.enabled" :label="t('admin.settingsPage.requestsEnabled')" />
          <div class="grid gap-3 sm:grid-cols-2">
            <UFormField :label="t('admin.settingsPage.requestsList')">
              <USelect v-model="form.requests.listKey" :items="(lists ?? []).map(x => ({ label: l(x.name), value: x.key }))" class="w-full" />
            </UFormField>
            <UFormField :label="t('admin.settingsPage.requestsPerDay')"><UInput v-model.number="form.requests.perDay" type="number" min="1" dir="ltr" class="w-32" /></UFormField>
          </div>
        </div>
      </UCard>

      <UCard class="max-w-3xl">
        <template #header><h2 class="font-bold">{{ t('admin.settingsPage.marketplace') }}</h2></template>
        <div class="space-y-4">
          <USwitch v-model="form.marketplace.sellersOpen" :label="t('admin.settingsPage.sellersOpen')" />
          <div class="grid gap-3 sm:grid-cols-2">
            <UFormField :label="t('admin.settingsPage.holdDays')" :help="t('admin.settingsPage.holdDaysHint')"><UInput v-model.number="form.marketplace.payoutHoldDays" type="number" min="0" max="90" dir="ltr" class="w-32" /></UFormField>
            <UFormField :label="t('admin.settingsPage.minPayout')"><UInput v-model.number="form.marketplace.minPayout" type="number" min="0" dir="ltr" class="w-40" /></UFormField>
          </div>
        </div>
      </UCard>

      <UCard class="max-w-3xl">
        <template #header><h2 class="font-bold">{{ t('admin.settingsPage.reviews') }}</h2></template>
        <div class="space-y-4">
          <USwitch v-model="form.reviews.enabled" :label="t('admin.settingsPage.reviewsEnabled')" :description="t('admin.settingsPage.reviewsEnabledHint')" />
          <USwitch v-model="form.reviews.moderate" :disabled="!form.reviews.enabled" :label="t('admin.settingsPage.reviewsModerate')" :description="t('admin.settingsPage.reviewsModerateHint')" />
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
