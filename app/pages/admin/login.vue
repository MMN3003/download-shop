<script setup lang="ts">
definePageMeta({ layout: false })
const { t } = useI18n()
const localePath = useLocalePath()
const { fetch } = useUserSession()
const state = reactive({ email: '', password: '' })
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: state })
    await fetch()
    await navigateTo(localePath('/admin'))
  }
  catch {
    error.value = t('admin.login.error')
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="min-h-screen grid place-items-center bg-elevated p-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-xl font-extrabold text-center">{{ t('admin.login.title') }}</h1>
      </template>
      <form class="space-y-4" @submit.prevent="submit">
        <UFormField :label="t('admin.login.email')"><UInput v-model="state.email" type="email" dir="ltr" autocomplete="username" class="w-full" required /></UFormField>
        <UFormField :label="t('admin.login.password')"><UInput v-model="state.password" type="password" dir="ltr" autocomplete="current-password" class="w-full" required /></UFormField>
        <UAlert v-if="error" color="error" variant="soft" :title="error" />
        <UButton type="submit" block :loading="busy" :label="t('admin.login.submit')" />
      </form>
    </UCard>
  </div>
</template>
