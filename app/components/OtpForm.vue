<script setup lang="ts">
/**
 * Two-step code form: enter a phone or email, then the 6-digit code.
 * Used for login and for adding a phone/email to an account.
 */
const props = defineProps<{ kind: 'phone' | 'email', submitLabel?: string, initial?: string }>()
const emit = defineEmits<{ done: [result: any] }>()
const { t } = useI18n()
const { num } = useL()

const target = ref(props.initial ?? '')
const sentTo = ref('')
const code = ref<(number | undefined)[]>([])
const busy = ref(false)
const error = ref('')
const wait = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

function countdown(s: number) {
  wait.value = s
  clearInterval(timer)
  timer = setInterval(() => { if (--wait.value <= 0) clearInterval(timer) }, 1000)
}
onBeforeUnmount(() => clearInterval(timer))

async function send() {
  busy.value = true
  error.value = ''
  try {
    const r = await $fetch<any>('/api/auth/otp/request', { method: 'POST', body: { target: target.value } })
    sentTo.value = r.target
    code.value = []
    countdown(r.resendIn)
  }
  catch (e: any) {
    error.value = apiError(e)
    if (e?.data?.data?.retryAfter) { sentTo.value ||= target.value; countdown(e.data.data.retryAfter) }
  }
  finally { busy.value = false }
}

async function verify() {
  if (code.value.join('').length !== 6) return
  busy.value = true
  error.value = ''
  try {
    const r = await $fetch('/api/auth/otp/verify', { method: 'POST', body: { target: sentTo.value, code: code.value.join('') } })
    emit('done', r)
  }
  catch (e: any) {
    error.value = e?.statusCode === 401 ? t('auth.wrongCode') : apiError(e)
    code.value = []
  }
  finally { busy.value = false }
}
</script>

<template>
  <form v-if="!sentTo" class="space-y-4" @submit.prevent="send">
    <UFormField :label="kind === 'phone' ? t('auth.phone') : t('auth.email')">
      <UInput v-model="target" :type="kind === 'phone' ? 'tel' : 'email'" :inputmode="kind === 'phone' ? 'tel' : 'email'" :autocomplete="kind === 'phone' ? 'tel' : 'email'" :placeholder="kind === 'phone' ? t('auth.phonePh') : 'name@example.com'" dir="ltr" size="xl" class="w-full" required autofocus />
    </UFormField>
    <UAlert v-if="error" color="error" variant="soft" :title="error" />
    <UButton type="submit" block size="lg" :loading="busy" :label="t('auth.sendCode')" />
  </form>
  <form v-else class="space-y-4" @submit.prevent="verify">
    <p class="text-sm">
      <i18n-t keypath="auth.codeSentTo" tag="span" scope="global"><template #target><bdi dir="ltr" class="font-bold">{{ sentTo }}</bdi></template></i18n-t>
      <UButton variant="link" size="xs" :label="t('auth.change')" @click="sentTo = ''" />
    </p>
    <div dir="ltr" class="flex justify-center">
      <UPinInput v-model="code" :length="6" otp type="number" size="xl" dir="ltr" autofocus @complete="verify" />
    </div>
    <UAlert v-if="error" color="error" variant="soft" :title="error" />
    <UButton type="submit" block size="lg" :loading="busy" :label="submitLabel ?? t('auth.verify')" />
    <UButton block variant="ghost" color="neutral" :disabled="wait > 0 || busy" :label="wait > 0 ? t('auth.resendIn', { s: num(wait) }) : t('auth.resend')" @click="send" />
  </form>
</template>
