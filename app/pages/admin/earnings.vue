<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { l, num, money, date } = useL()
const localePath = useLocalePath()
const toast = useToast()
const page = ref(1)
const { data, refresh } = await useFetch<any>('/api/seller/earnings', { query: { page }, watch: [page] })
const { data: payouts, refresh: refreshPayouts } = await useFetch<any>('/api/seller/payouts')
const amount = ref<number | null>(null)
watch(() => payouts.value?.balance.available, (v) => { if (amount.value == null && v) amount.value = v }, { immediate: true })
const busy = ref(false)
const payoutColor: Record<string, any> = { REQUESTED: 'warning', PAID: 'success', REJECTED: 'error' }

async function requestPayout() {
  busy.value = true
  try {
    await $fetch('/api/seller/payouts', { method: 'POST', body: { amount: Number(amount.value) } })
    toast.add({ title: t('seller.payoutSent'), color: 'success' })
    amount.value = null
    await Promise.all([refresh(), refreshPayouts()])
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
  finally { busy.value = false }
}
</script>

<template>
  <UDashboardPanel>
    <template #header><UDashboardNavbar :title="t('seller.earnings')"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar></template>
    <template #body>
      <div v-if="data" class="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <UCard><p class="text-sm text-muted">{{ t('seller.totals.sales') }}</p><p class="text-xl font-extrabold">{{ num(data.totals.sales) }}</p></UCard>
        <UCard><p class="text-sm text-muted">{{ t('seller.totals.gross') }}</p><p class="text-xl font-extrabold">{{ money(data.totals.gross) }}</p></UCard>
        <UCard><p class="text-sm text-muted">{{ t('seller.totals.commission') }}</p><p class="text-xl font-extrabold">{{ money(data.totals.commission) }}</p></UCard>
        <UCard><p class="text-sm text-muted">{{ t('seller.totals.net') }}</p><p class="text-xl font-extrabold text-success">{{ money(data.totals.net) }}</p></UCard>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <UCard :ui="{ body: 'p-0 sm:p-0' }" class="min-w-0">
          <template #header><h2 class="font-bold">{{ t('seller.salesList') }}</h2></template>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="text-muted text-start">
                <tr class="border-b border-default">
                  <th class="p-3 text-start font-medium">{{ t('admin.product.title') }}</th>
                  <th class="p-3 text-start font-medium">{{ t('seller.orderNo') }}</th>
                  <th class="p-3 text-end font-medium">{{ t('admin.product.price') }}</th>
                  <th class="p-3 text-end font-medium">{{ t('seller.totals.commission') }}</th>
                  <th class="p-3 text-end font-medium">{{ t('seller.totals.net') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr v-for="i in data?.items" :key="i.id" :class="i.status === 'REFUNDED' ? 'line-through text-muted' : ''">
                  <td class="p-3"><p class="font-medium">{{ l(i.title) }}</p><p class="text-xs text-muted">{{ date(i.paidAt) }}</p></td>
                  <td class="p-3">#{{ num(i.orderNumber) }}</td>
                  <td class="p-3 text-end">{{ money(i.price) }}</td>
                  <td class="p-3 text-end">{{ money(i.commission) }} <span class="text-xs text-muted">({{ num(i.percent) }}٪)</span></td>
                  <td class="p-3 text-end font-bold">{{ money(i.sellerNet) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <UEmpty v-if="!data?.items.length" icon="i-lucide-receipt" :title="t('seller.noSales')" class="py-10" />
          <div v-if="data && data.total > data.perPage" class="flex justify-center p-3"><UPagination v-model:page="page" :total="data.total" :items-per-page="data.perPage" /></div>
        </UCard>

        <div class="space-y-6">
          <UCard v-if="payouts">
            <template #header><h2 class="font-bold">{{ t('seller.payout') }}</h2></template>
            <div class="space-y-3">
              <div class="flex justify-between"><span class="text-muted">{{ t('seller.available') }}</span><span class="font-extrabold text-success">{{ money(payouts.balance.available) }}</span></div>
              <div class="flex justify-between text-sm"><span class="text-muted">{{ t('seller.held', { n: num(payouts.balance.holdDays) }) }}</span><span>{{ money(payouts.balance.held) }}</span></div>
              <div class="flex justify-between text-sm"><span class="text-muted">{{ t('seller.paidOut') }}</span><span>{{ money(payouts.balance.paidOut) }}</span></div>
              <UAlert v-if="!payouts.sheba" color="warning" variant="soft" icon="i-lucide-landmark" :title="t('seller.noSheba')" :actions="[{ label: t('seller.shop'), to: localePath('/admin/shop') }]" />
              <form v-else class="space-y-3" @submit.prevent="requestPayout">
                <UFormField :label="t('seller.amount')" :help="t('seller.minPayout', { n: money(payouts.balance.minPayout) })">
                  <UInput v-model.number="amount" type="number" :min="payouts.balance.minPayout" :max="payouts.balance.available" dir="ltr" class="w-full" />
                </UFormField>
                <p class="text-xs text-muted" dir="ltr">{{ payouts.sheba }}</p>
                <UButton type="submit" block icon="i-lucide-banknote" :loading="busy" :disabled="!amount || amount < payouts.balance.minPayout || amount > payouts.balance.available" :label="t('seller.requestPayout')" />
              </form>
            </div>
          </UCard>
          <UCard v-if="payouts?.items.length" :ui="{ body: 'p-0 sm:p-0' }">
            <template #header><h2 class="font-bold">{{ t('seller.payouts') }}</h2></template>
            <ul class="divide-y divide-default text-sm">
              <li v-for="p in payouts.items" :key="p.id" class="p-3 space-y-1">
                <div class="flex justify-between gap-2"><span class="font-bold">{{ money(p.amount) }}</span><UBadge :color="payoutColor[p.status]" variant="soft">{{ t(`seller.payoutStatus.${p.status}`) }}</UBadge></div>
                <p class="text-xs text-muted">{{ date(p.createdAt) }}<span v-if="p.reference"> · {{ t('seller.reference') }}: <span dir="ltr">{{ p.reference }}</span></span></p>
                <p v-if="p.note" class="text-xs whitespace-pre-line" dir="auto">{{ p.note }}</p>
              </li>
            </ul>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
