<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const toast = useToast()
const { data: s } = await useFetch<any>('/api/admin/settings')
const form = ref<any>(s.value ? { ...s.value } : {})
const saving = ref(false)

async function save() {
  saving.value = true
  const { logoUrl: _l, ...body } = form.value
  try {
    await $fetch('/api/admin/settings', { method: 'PUT', body: { ...body, defaultCommissionPercent: Number(body.defaultCommissionPercent) } })
    await refreshNuxtData('store')
    toast.add({ title: t('admin.saved'), color: 'success' })
  }
  catch (e: any) {
    toast.add({ title: t('admin.error'), description: e?.data?.message, color: 'error' })
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
            <UInput v-model.number="form.defaultCommissionPercent" type="number" min="0" max="100" dir="ltr" class="w-40"><template #trailing>%</template></UInput>
          </UFormField>
          <UFormField :label="t('admin.settingsPage.social')">
            <div class="grid gap-2 sm:grid-cols-2">
              <UInput v-model="form.social.instagram" dir="ltr" placeholder="https://instagram.com/…" icon="i-lucide-instagram" />
              <UInput v-model="form.social.telegram" dir="ltr" placeholder="https://t.me/…" icon="i-lucide-send" />
            </div>
          </UFormField>
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
