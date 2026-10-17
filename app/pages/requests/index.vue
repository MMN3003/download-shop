<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { t } = useI18n()
const { date, num } = useL()
const localePath = useLocalePath()
const toast = useToast()
const { data: opts, items, options } = await useRequestOptions()
const { data: mine, refresh } = await useFetch<any[]>('/api/requests')

const form = reactive({ source: '', target: 'persian', subject: '', details: '' })
if (!options.value.some(o => o.value === form.target)) form.target = ''
const busy = ref(false)

async function send() {
  busy.value = true
  try {
    const r = await $fetch<{ number: number }>('/api/requests', { method: 'POST', body: form })
    toast.add({ title: t('request.sent'), color: 'success' })
    await refresh()
    await navigateTo(localePath(`/requests/${r.number}`))
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
  finally { busy.value = false }
}
useSeoMeta({ title: () => t('request.title'), robots: 'noindex' })
</script>

<template>
  <UContainer class="py-8 max-w-3xl space-y-8">
    <div>
      <h1 class="text-2xl font-extrabold">{{ t('request.title') }}</h1>
      <p class="text-muted mt-2">{{ t('request.intro') }}</p>
    </div>

    <UCard v-if="opts?.enabled">
      <template #header><h2 class="font-bold">{{ t('request.new') }}</h2></template>
      <form class="space-y-4" @submit.prevent="send">
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField :label="t('request.source')" required>
            <USelectMenu v-model="form.source" :items="items" value-key="value" class="w-full" :search-input="false">
              <template #leading><OptionMark :option="options.find(o => o.value === form.source)" /></template>
            </USelectMenu>
          </UFormField>
          <UFormField :label="t('request.target')" required>
            <USelectMenu v-model="form.target" :items="items" value-key="value" class="w-full" :search-input="false">
              <template #leading><OptionMark :option="options.find(o => o.value === form.target)" /></template>
            </USelectMenu>
          </UFormField>
        </div>
        <UFormField :label="t('request.subject')" required>
          <UInput v-model="form.subject" :placeholder="t('request.subjectPh')" maxlength="200" class="w-full" required minlength="3" />
        </UFormField>
        <UFormField :label="t('request.details')" :help="t('request.plainNote')">
          <UTextarea v-model="form.details" :placeholder="t('request.detailsPh')" :rows="4" maxlength="4000" autoresize class="w-full" />
        </UFormField>
        <UButton type="submit" icon="i-lucide-send" :loading="busy" :disabled="!form.source || !form.target || form.subject.trim().length < 3" :label="t('request.send')" />
      </form>
    </UCard>

    <section class="space-y-3">
      <h2 class="text-lg font-bold">{{ t('request.mine') }}</h2>
      <UEmpty v-if="!mine?.length" icon="i-lucide-message-square-plus" :title="t('request.none')" />
      <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
        <ul class="divide-y divide-default">
          <li v-for="r in mine" :key="r.number">
            <NuxtLink :to="localePath(`/requests/${r.number}`)" class="flex items-center gap-4 p-4 hover:bg-elevated/50">
              <div class="flex-1 min-w-0 space-y-1">
                <p class="font-bold truncate">{{ r.subject }}</p>
                <p class="text-sm text-muted"><RequestRoute :source="r.source" :target="r.target" :options="options" /></p>
              </div>
              <div class="text-end space-y-1">
                <UBadge v-if="r.unread" color="primary" variant="solid" size="sm">{{ t('request.unread') }}</UBadge>
                <RequestStatus :status="r.status" />
                <p class="text-xs text-muted">#{{ num(r.number) }} · {{ date(r.updatedAt) }}</p>
              </div>
            </NuxtLink>
          </li>
        </ul>
      </UCard>
    </section>
  </UContainer>
</template>
