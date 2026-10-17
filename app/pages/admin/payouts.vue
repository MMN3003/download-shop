<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { num, money, date } = useL()
const localePath = useLocalePath()
const toast = useToast()
const status = ref('REQUESTED')
const query = computed(() => ({ status: status.value === '__all' ? undefined : status.value }))
const { data, refresh } = await useFetch<any[]>('/api/admin/payouts', { query, watch: [query] })
const tabs = computed(() => [...['REQUESTED', 'PAID', 'REJECTED'].map(s => ({ label: t(`seller.payoutStatus.${s}`), value: s })), { label: t('admin.order.all'), value: '__all' }])
const forms = reactive<Record<string, { reference: string, note: string }>>({})
const f = (id: string) => (forms[id] ??= { reference: '', note: '' })
const colors: Record<string, any> = { REQUESTED: 'warning', PAID: 'success', REJECTED: 'error' }

async function decide(id: string, action: 'paid' | 'reject') {
  try {
    await $fetch(`/api/admin/payouts/${id}`, { method: 'PUT', body: { action, ...f(id) } })
    toast.add({ title: t('admin.saved'), color: 'success' })
    await refresh()
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
}
async function copy(text: string) {
  await navigator.clipboard?.writeText(text)
  toast.add({ title: t('admin.payout.copied'), color: 'neutral' })
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('admin.payouts')"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar>
      <UDashboardToolbar><UTabs v-model="status" :items="tabs" :content="false" variant="link" size="sm" class="overflow-x-auto" /></UDashboardToolbar>
    </template>
    <template #body>
      <UEmpty v-if="!data?.length" icon="i-lucide-banknote" :title="t('catalog.noResults')" class="py-10" />
      <UCard v-for="p in data" :key="p.id">
        <div class="flex flex-wrap items-start gap-4">
          <div class="flex-1 min-w-48 space-y-1">
            <p class="text-xl font-extrabold">{{ money(p.amount) }}</p>
            <p class="text-sm"><NuxtLink :to="localePath(`/admin/sellers/${p.seller.id}`)" class="underline">{{ p.seller.displayName }}</NuxtLink> · {{ p.seller.accountHolder || '—' }}</p>
            <p class="text-sm flex items-center gap-1"><span dir="ltr" class="font-mono">{{ p.sheba }}</span><UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-copy" :aria-label="t('admin.payout.copy')" @click="copy(p.sheba)" /></p>
            <p class="text-xs text-muted">{{ date(p.createdAt) }}<span v-if="p.paidAt"> · {{ t('admin.payout.paidAt') }} {{ date(p.paidAt) }}</span><span v-if="p.reference"> · {{ t('seller.reference') }}: <span dir="ltr">{{ p.reference }}</span></span></p>
            <p v-if="p.note" class="text-sm whitespace-pre-line" dir="auto">{{ p.note }}</p>
          </div>
          <UBadge :color="colors[p.status]" variant="soft">{{ t(`seller.payoutStatus.${p.status}`) }}</UBadge>
        </div>
        <form v-if="p.status === 'REQUESTED'" class="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] items-end" @submit.prevent="decide(p.id, 'paid')">
          <UFormField :label="t('seller.reference')"><UInput v-model="f(p.id).reference" dir="ltr" maxlength="100" class="w-full" /></UFormField>
          <UFormField :label="t('admin.seller.note')"><UInput v-model="f(p.id).note" maxlength="1000" class="w-full" /></UFormField>
          <UButton type="submit" color="success" icon="i-lucide-check" :disabled="!f(p.id).reference.trim()" :label="t('admin.payout.markPaid')" />
          <UButton color="error" variant="soft" icon="i-lucide-x" :label="t('admin.seller.reject')" @click="decide(p.id, 'reject')" />
        </form>
      </UCard>
      <p class="text-xs text-muted">{{ t('admin.payout.help', { n: num(data?.length ?? 0) }) }}</p>
    </template>
  </UDashboardPanel>
</template>
