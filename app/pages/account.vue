<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()
const { fetch: refreshSession, clear } = useUserSession()
const { data: me, refresh } = await useFetch<any>('/api/account')

const name = ref(me.value?.name ?? '')
const linking = ref<'phone' | 'email' | null>(null)
const pw = reactive({ current: '', password: '' })
const busy = ref(false)

async function saveName() {
  await $fetch('/api/account', { method: 'PUT', body: { name: name.value } })
  await refreshSession()
  toast.add({ title: t('account.saved'), color: 'success' })
}
async function linked() {
  linking.value = null
  await refresh()
  toast.add({ title: t('account.linked'), color: 'success' })
}
async function savePassword() {
  busy.value = true
  try {
    await $fetch('/api/account/password', { method: 'POST', body: { password: pw.password, current: pw.current || undefined } })
    pw.current = ''
    pw.password = ''
    await refresh()
    toast.add({ title: t('account.passwordSaved'), color: 'success' })
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
  finally { busy.value = false }
}
async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo(localePath('/'))
}
useSeoMeta({ title: () => t('account.title'), robots: 'noindex' })
</script>

<template>
  <UContainer v-if="me" class="py-8 max-w-2xl space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-extrabold">{{ t('account.title') }}</h1>
      <div class="flex gap-2">
        <UButton color="neutral" variant="outline" icon="i-lucide-library" :label="t('nav.library')" :to="localePath('/library')" />
        <UButton color="neutral" variant="outline" icon="i-lucide-receipt" :label="t('nav.orders')" :to="localePath('/orders')" />
      </div>
    </div>

    <UCard>
      <form class="flex gap-2 items-end" @submit.prevent="saveName">
        <UFormField :label="t('account.name')" class="flex-1"><UInput v-model="name" class="w-full" /></UFormField>
        <UButton type="submit" :label="t('account.save')" />
      </form>
    </UCard>

    <UCard>
      <p class="text-sm text-muted mb-4">{{ t('account.linkHint') }}</p>
      <div class="divide-y divide-default">
        <div v-for="k in (['phone', 'email'] as const)" :key="k" class="py-3 space-y-3">
          <div class="flex items-center gap-3">
            <UIcon :name="k === 'phone' ? 'i-lucide-smartphone' : 'i-lucide-mail'" class="size-5 text-muted" />
            <div class="flex-1">
              <p class="text-sm text-muted">{{ t(`account.${k}`) }}</p>
              <p class="font-medium" dir="ltr">{{ me[k] || '—' }}</p>
            </div>
            <UButton size="sm" color="neutral" variant="outline" :label="me[k] ? t('account.change') : t('account.add')" @click="linking = linking === k ? null : k" />
          </div>
          <OtpForm v-if="linking === k" :kind="k" :submit-label="t('account.verify')" @done="linked" />
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header><h2 class="font-bold">{{ me.hasPassword ? t('account.changePassword') : t('account.setPassword') }}</h2></template>
      <p v-if="!me.email" class="text-sm text-muted">{{ t('account.needEmail') }}</p>
      <form v-else class="space-y-3" @submit.prevent="savePassword">
        <UFormField v-if="me.hasPassword" :label="t('account.current')"><UInput v-model="pw.current" type="password" dir="ltr" autocomplete="current-password" class="w-full" /></UFormField>
        <UFormField :label="t('account.newPassword')"><UInput v-model="pw.password" type="password" dir="ltr" autocomplete="new-password" minlength="8" class="w-full" required /></UFormField>
        <UButton type="submit" :loading="busy" :label="t('account.save')" />
      </form>
    </UCard>

    <UButton color="error" variant="soft" icon="i-lucide-log-out" :label="t('account.logout')" @click="logout" />
  </UContainer>
</template>
