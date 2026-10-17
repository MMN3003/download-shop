<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const route = useRoute()
const { t } = useI18n()
const { num, date } = useL()
const localePath = useLocalePath()
const toast = useToast()
const requestFetch = useRequestFetch()
const { data: r, refresh } = await useAsyncData(`admin-request-${route.params.id}`, () => requestFetch<any>(`/api/admin/requests/${route.params.id}`))

const form = reactive({ status: r.value?.status ?? 'OPEN', productSlug: r.value?.product?.slug ?? '', message: '' })
const statusItems = computed(() => ['OPEN', 'IN_PROGRESS', 'DONE', 'DECLINED'].map(s => ({ label: t(`request.status.${s}`), value: s })))
const busy = ref(false)

async function save() {
  busy.value = true
  try {
    await $fetch(`/api/admin/requests/${r.value.id}`, { method: 'PUT', body: { ...form, productSlug: form.productSlug || null } })
    form.message = ''
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
      <UDashboardNavbar :title="r ? `#${num(r.number)}` : ''">
        <template #leading><UButton icon="i-lucide-arrow-right" color="neutral" variant="ghost" class="ltr:rotate-180" :to="localePath('/admin/requests')" /></template>
        <template #right><RequestStatus v-if="r" :status="r.status" /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div v-if="r" class="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div class="space-y-6 min-w-0">
          <UCard>
            <h1 class="text-xl font-extrabold break-words">{{ r.subject }}</h1>
            <p class="mt-2"><RequestRoute :source="r.source" :target="r.target" :options="r.options" /></p>
            <p v-if="r.details" class="mt-4 whitespace-pre-line break-words leading-7" dir="auto">{{ r.details }}</p>
          </UCard>
          <MessageThread v-if="r.messages.length" :messages="r.messages" viewer="staff" />
          <UCard>
            <form class="space-y-4" @submit.prevent="save">
              <UFormField :label="t('admin.request.answer')"><UTextarea v-model="form.message" :rows="4" maxlength="4000" autoresize class="w-full" /></UFormField>
              <div class="grid gap-3 sm:grid-cols-2">
                <UFormField :label="t('admin.request.status')"><USelect v-model="form.status" :items="statusItems" class="w-full" /></UFormField>
                <UFormField :label="t('admin.request.product')"><UInput v-model="form.productSlug" dir="ltr" placeholder="iraqi-arabic-…" class="w-full" /></UFormField>
              </div>
              <UButton type="submit" icon="i-lucide-send" :loading="busy" :label="t('admin.request.save')" />
            </form>
          </UCard>
        </div>
        <UCard class="self-start">
          <template #header><p class="font-bold">{{ t('admin.request.buyer') }}</p></template>
          <p class="font-medium">{{ r.user.name || '—' }}</p>
          <p v-if="r.user.phone" dir="ltr" class="text-sm text-end">{{ r.user.phone }}</p>
          <p v-if="r.user.email" dir="ltr" class="text-sm text-end">{{ r.user.email }}</p>
          <p class="text-xs text-muted mt-2">{{ t('admin.request.others', { n: num(r.others) }) }}</p>
          <p class="text-xs text-muted">{{ date(r.createdAt) }}</p>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
