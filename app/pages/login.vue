<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { fetch, loggedIn } = useUserSession()

const tab = ref('phone')
const emailMode = ref<'password' | 'code'>('password')
const form = reactive({ email: '', password: '' })
const error = ref('')
const busy = ref(false)

async function finish() {
  await fetch()
  const r = String(route.query.redirect ?? '')
  await navigateTo(r.startsWith('/') && !r.startsWith('//') ? r : localePath('/library'))
}
if (loggedIn.value) await finish()

async function passwordLogin() {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: form })
    await finish()
  }
  catch { error.value = t('auth.wrongPassword') }
  finally { busy.value = false }
}

useSeoMeta({ title: () => t('auth.title'), robots: 'noindex' })
</script>

<template>
  <UContainer class="py-12">
    <UCard class="max-w-md mx-auto">
      <template #header>
        <h1 class="text-xl font-extrabold text-center">{{ t('auth.title') }}</h1>
      </template>
      <UTabs v-model="tab" :items="[{ label: t('auth.phoneTab'), value: 'phone', icon: 'i-lucide-smartphone' }, { label: t('auth.emailTab'), value: 'email', icon: 'i-lucide-mail' }]" class="w-full" :content="false" />
      <div class="pt-6">
        <OtpForm v-if="tab === 'phone'" kind="phone" @done="finish" />
        <template v-else>
          <form v-if="emailMode === 'password'" class="space-y-4" @submit.prevent="passwordLogin">
            <UFormField :label="t('auth.email')"><UInput v-model="form.email" type="email" dir="ltr" size="xl" autocomplete="username" class="w-full" required /></UFormField>
            <UFormField :label="t('auth.password')"><UInput v-model="form.password" type="password" dir="ltr" size="xl" autocomplete="current-password" class="w-full" required /></UFormField>
            <UAlert v-if="error" color="error" variant="soft" :title="error" />
            <UButton type="submit" block size="lg" :loading="busy" :label="t('auth.login')" />
          </form>
          <OtpForm v-else kind="email" :initial="form.email" @done="finish" />
          <UButton block variant="link" class="mt-2" :label="emailMode === 'password' ? t('auth.withCode') : t('auth.withPassword')" @click="emailMode = emailMode === 'password' ? 'code' : 'password'" />
          <p v-if="emailMode === 'password'" class="text-xs text-muted text-center">{{ t('auth.forgot') }}</p>
        </template>
      </div>
      <template #footer>
        <p class="text-sm text-muted text-center">{{ t('auth.newHint') }}</p>
      </template>
    </UCard>
  </UContainer>
</template>
