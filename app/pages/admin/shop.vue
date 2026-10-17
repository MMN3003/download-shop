<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const localePath = useLocalePath()
const toast = useToast()
const { data, refresh } = await useFetch<any>('/api/seller/me')
const s = data.value?.seller
const form = reactive({ displayName: s?.displayName ?? '', bio: s?.bio ?? '', avatar: s?.avatar ?? null, sheba: s?.sheba ?? '', accountHolder: s?.accountHolder ?? '' })
const busy = ref(false)
async function save() {
  busy.value = true
  try {
    await $fetch('/api/seller/profile', { method: 'PUT', body: form })
    toast.add({ title: t('admin.saved'), color: 'success' })
    await refresh()
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
  finally { busy.value = false }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('seller.shop')">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UButton v-if="s" color="neutral" variant="ghost" icon="i-lucide-external-link" :label="t('seller.viewShop')" :to="localePath(`/seller/${s.slug}`)" target="_blank" /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <form v-if="s" class="space-y-6 max-w-2xl" @submit.prevent="save">
        <UCard>
          <template #header><h2 class="font-bold">{{ t('seller.profile') }}</h2></template>
          <div class="space-y-4">
            <UFormField :label="t('seller.displayName')" required><UInput v-model="form.displayName" maxlength="80" class="w-full" /></UFormField>
            <UFormField :label="t('seller.slug')"><UInput :model-value="s.slug" dir="ltr" disabled class="w-full" /></UFormField>
            <UFormField :label="t('seller.bio')" :help="t('request.plainNote')"><UTextarea v-model="form.bio" :rows="4" maxlength="1000" autoresize class="w-full" /></UFormField>
            <UFormField :label="t('seller.avatar')"><AdminImageUpload v-model="form.avatar" :url="s.avatarUrl" /></UFormField>
          </div>
        </UCard>
        <UCard>
          <template #header><h2 class="font-bold">{{ t('seller.bank') }}</h2></template>
          <div class="space-y-4">
            <UFormField :label="t('seller.sheba')" :help="t('seller.shebaHelp')"><UInput v-model="form.sheba" dir="ltr" placeholder="IR000000000000000000000000" maxlength="34" class="w-full" /></UFormField>
            <UFormField :label="t('seller.accountHolder')"><UInput v-model="form.accountHolder" maxlength="100" class="w-full" /></UFormField>
          </div>
        </UCard>
        <UButton type="submit" icon="i-lucide-save" :loading="busy" :label="t('admin.save')" />
      </form>
    </template>
  </UDashboardPanel>
</template>
