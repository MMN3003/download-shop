<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const route = useRoute()
const { t } = useI18n()
const { l, num, date } = useL()
const localePath = useLocalePath()
const toast = useToast()
const { options } = await useRequestOptions()
const { data: r, refresh, error } = await useFetch<any>(() => `/api/requests/${route.params.number}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 500, fatal: true })

const body = ref('')
const busy = ref(false)
async function send() {
  busy.value = true
  try {
    await $fetch(`/api/requests/${r.value.number}/messages`, { method: 'POST', body: { body: body.value } })
    body.value = ''
    await refresh()
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
  finally { busy.value = false }
}
useSeoMeta({ title: () => t('request.number', { n: r.value?.number }), robots: 'noindex' })
</script>

<template>
  <UContainer v-if="r" class="py-8 max-w-3xl space-y-6">
    <UButton icon="i-lucide-arrow-right" variant="link" color="neutral" class="ltr:[&_svg]:rotate-180 px-0" :label="t('request.mine')" :to="localePath('/requests')" />
    <UCard>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-2 min-w-0">
          <p class="text-sm text-muted">{{ t('request.number', { n: num(r.number) }) }} · {{ date(r.createdAt) }}</p>
          <h1 class="text-xl font-extrabold break-words">{{ r.subject }}</h1>
          <RequestRoute :source="r.source" :target="r.target" :options="options" />
        </div>
        <RequestStatus :status="r.status" />
      </div>
      <p v-if="r.details" class="mt-4 whitespace-pre-line break-words text-muted leading-7" dir="auto">{{ r.details }}</p>
      <UAlert v-if="r.product" class="mt-4" color="success" variant="subtle" icon="i-lucide-gift" :title="t('request.ready')" :actions="[{ label: l(r.product.title), to: localePath(`/p/${r.product.slug}`) }]" />
    </UCard>

    <MessageThread v-if="r.messages.length" :messages="r.messages" viewer="user" />

    <p v-if="r.status === 'DECLINED'" class="text-sm text-muted">{{ t('request.closed') }}</p>
    <form v-else class="space-y-2" @submit.prevent="send">
      <UTextarea v-model="body" :placeholder="t('request.reply')" :rows="3" maxlength="4000" autoresize class="w-full" />
      <div class="flex items-center justify-between">
        <span class="text-xs text-muted">{{ t('request.plainNote') }}</span>
        <UButton type="submit" icon="i-lucide-send" :loading="busy" :disabled="!body.trim()" :label="t('request.send2')" />
      </div>
    </form>
  </UContainer>
</template>
