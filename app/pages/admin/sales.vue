<script setup lang="ts">
/** Sales over a date range: totals, a chart by day or month, best sellers, coupons and what each seller is owed. */
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { l, num, money, date, locale } = useL()
const localePath = useLocalePath()

const iso = (d: Date) => d.toISOString().slice(0, 10)
const today = new Date()
const from = ref(iso(new Date(today.getTime() - 29 * 86400_000)))
const to = ref(iso(today))
const query = computed(() => ({ from: from.value, to: to.value }))
const { data, error } = await useFetch<any>('/api/admin/sales', { query, watch: [query] })

function preset(days: number | 'year') {
  const end = new Date()
  to.value = iso(end)
  from.value = days === 'year' ? `${end.getUTCFullYear()}-01-01` : iso(new Date(end.getTime() - (days - 1) * 86400_000))
}

// Buckets are calendar days or Gregorian months (UTC), so months are labelled in that calendar
const bucketLabel = (d: string) => new Intl.DateTimeFormat(`${locale.value === 'fa' ? 'fa-IR' : 'en-US'}-u-ca-gregory`, data.value?.group === 'month' ? { year: 'numeric', month: 'short' } : { month: 'short', day: 'numeric' }).format(new Date(d))
const monthLabel = (d: string) => new Intl.DateTimeFormat(`${locale.value === 'fa' ? 'fa-IR' : 'en-US'}-u-ca-gregory`, { year: 'numeric', month: 'long' }).format(new Date(d))
const peak = computed(() => Math.max(1, ...(data.value?.series ?? []).map((s: any) => s.gross)))
const csv = computed(() => `/api/admin/sales.csv?from=${from.value}&to=${to.value}`)
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('admin.sales')">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UButton icon="i-lucide-download" color="neutral" variant="outline" :label="t('sales.csv')" :to="csv" external download /></template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <div class="flex flex-wrap items-center gap-2">
          <UInput v-model="from" type="date" size="sm" dir="ltr" :aria-label="t('sales.from')" />
          <span class="text-muted">–</span>
          <UInput v-model="to" type="date" size="sm" dir="ltr" :aria-label="t('sales.to')" />
          <UButton size="xs" color="neutral" variant="ghost" :label="t('sales.last7')" @click="preset(7)" />
          <UButton size="xs" color="neutral" variant="ghost" :label="t('sales.last30')" @click="preset(30)" />
          <UButton size="xs" color="neutral" variant="ghost" :label="t('sales.last365')" @click="preset(365)" />
          <UButton size="xs" color="neutral" variant="ghost" :label="t('sales.thisYear')" @click="preset('year')" />
        </div>
      </UDashboardToolbar>
    </template>
    <template #body>
      <div class="space-y-4">
        <UAlert v-if="error" color="error" variant="soft" :title="apiError(error)" />
        <template v-if="data">
          <div class="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <UCard><p class="text-sm text-muted">{{ t('sales.orders') }}</p><p class="text-xl font-extrabold">{{ num(data.totals.orders) }}</p></UCard>
            <UCard><p class="text-sm text-muted">{{ t('sales.gross') }}</p><p class="text-xl font-extrabold">{{ money(data.totals.gross) }}</p></UCard>
            <UCard><p class="text-sm text-muted">{{ t('sales.discount') }}</p><p class="text-xl font-extrabold">{{ money(data.totals.discount) }}</p></UCard>
            <UCard><p class="text-sm text-muted">{{ t('sales.commission') }}</p><p class="text-xl font-extrabold text-success">{{ money(data.totals.commission) }}</p></UCard>
            <UCard><p class="text-sm text-muted">{{ t('sales.sellerNet') }}</p><p class="text-xl font-extrabold">{{ money(data.totals.sellerNet) }}</p></UCard>
          </div>
          <p v-if="data.totals.refunds" class="text-sm text-muted">{{ t('sales.refunds', { n: num(data.totals.refunds), amount: money(data.totals.refunded) }) }}</p>

          <UCard>
            <p class="font-bold mb-4">{{ data.group === 'month' ? t('sales.byMonth') : t('sales.byDay') }}</p>
            <UEmpty v-if="!data.series.length" icon="i-lucide-chart-line" :title="t('sales.none')" />
            <div v-else class="overflow-x-auto">
              <div class="flex items-end gap-1 h-48 min-w-max" dir="ltr">
                <div v-for="s in data.series" :key="s.bucket" class="group relative flex flex-col items-center justify-end h-full w-6 sm:w-8">
                  <div class="w-full rounded-t bg-primary/70 group-hover:bg-primary transition" :style="{ height: `${Math.max(2, s.gross / peak * 100)}%` }" />
                  <div class="pointer-events-none absolute bottom-full mb-1 hidden group-hover:block whitespace-nowrap rounded bg-inverted text-inverted text-xs px-2 py-1 z-10" :dir="locale === 'fa' ? 'rtl' : 'ltr'">
                    {{ bucketLabel(s.bucket) }}: {{ money(s.gross) }} · {{ t('sales.ordersN', { n: num(s.orders) }) }}
                  </div>
                </div>
              </div>
              <div class="flex gap-1 min-w-max mt-1" dir="ltr">
                <span v-for="(s, i) in data.series" :key="s.bucket" class="w-6 sm:w-8 text-[10px] text-muted text-center truncate">{{ Number(i) % Math.ceil(data.series.length / 8) === 0 ? bucketLabel(s.bucket) : '' }}</span>
              </div>
            </div>
          </UCard>

          <div class="grid gap-6 lg:grid-cols-2">
            <UCard :ui="{ body: 'p-0 sm:p-0' }">
              <template #header><p class="font-bold">{{ t('sales.topProducts') }}</p></template>
              <UEmpty v-if="!data.topProducts.length" :title="t('sales.none')" class="py-6" />
              <ul class="divide-y divide-default">
                <li v-for="p in data.topProducts" :key="p.id" class="flex items-center gap-3 px-4 py-2 text-sm">
                  <NuxtLink :to="localePath(`/admin/products/${p.id}`)" class="flex-1 truncate hover:text-primary">{{ l(p.title) }}</NuxtLink>
                  <span class="text-muted">{{ num(p.sales) }}</span>
                  <span class="font-medium w-32 text-end">{{ money(p.gross) }}</span>
                </li>
              </ul>
            </UCard>
            <UCard :ui="{ body: 'p-0 sm:p-0' }">
              <template #header><p class="font-bold">{{ t('sales.topSellers') }}</p></template>
              <UEmpty v-if="!data.topSellers.length" :title="t('sales.none')" class="py-6" />
              <ul class="divide-y divide-default">
                <li v-for="s in data.topSellers" :key="s.id" class="flex items-center gap-3 px-4 py-2 text-sm">
                  <NuxtLink :to="localePath(`/admin/sellers/${s.id}`)" class="flex-1 truncate hover:text-primary"><bdi>{{ s.name }}</bdi></NuxtLink>
                  <span class="text-muted">{{ money(s.gross) }}</span>
                  <span class="font-medium w-32 text-end text-success">{{ money(s.commission) }}</span>
                </li>
              </ul>
            </UCard>
          </div>

          <UCard v-if="data.coupons.length" :ui="{ body: 'p-0 sm:p-0' }">
            <template #header><p class="font-bold">{{ t('sales.coupons') }}</p></template>
            <ul class="divide-y divide-default">
              <li v-for="c in data.coupons" :key="c.code" class="flex items-center gap-3 px-4 py-2 text-sm">
                <span class="flex-1 font-mono" dir="ltr">{{ c.code }}</span>
                <span class="text-muted">{{ t('sales.ordersN', { n: num(c.orders) }) }}</span>
                <span class="font-medium w-32 text-end">{{ money(c.discount) }}</span>
              </li>
            </ul>
          </UCard>

          <UCard :ui="{ body: 'p-0 sm:p-0' }">
            <template #header>
              <p class="font-bold">{{ t('sales.settlement') }}</p>
              <p class="text-xs text-muted">{{ t('sales.settlementHelp') }}</p>
            </template>
            <UEmpty v-if="!data.settlement.length" :title="t('sales.none')" class="py-6" />
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="text-muted text-start">
                  <tr class="border-b border-default">
                    <th class="px-4 py-2 text-start font-medium">{{ t('sales.month') }}</th>
                    <th class="px-4 py-2 text-start font-medium">{{ t('sales.seller') }}</th>
                    <th class="px-4 py-2 text-end font-medium">{{ t('sales.lines') }}</th>
                    <th class="px-4 py-2 text-end font-medium">{{ t('sales.commission') }}</th>
                    <th class="px-4 py-2 text-end font-medium">{{ t('sales.sellerNet') }}</th>
                    <th class="px-4 py-2 text-end font-medium">{{ t('sales.paidOut') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default">
                  <tr v-for="s in data.settlement" :key="`${s.month}-${s.sellerId}`">
                    <td class="px-4 py-2 whitespace-nowrap">{{ monthLabel(s.month) }}</td>
                    <td class="px-4 py-2"><NuxtLink :to="localePath(`/admin/sellers/${s.sellerId}`)" class="hover:text-primary"><bdi>{{ s.name }}</bdi></NuxtLink></td>
                    <td class="px-4 py-2 text-end">{{ num(s.lines) }}</td>
                    <td class="px-4 py-2 text-end">{{ money(s.commission) }}</td>
                    <td class="px-4 py-2 text-end font-medium">{{ money(s.net) }}</td>
                    <td class="px-4 py-2 text-end text-muted">{{ money(s.paidOut) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </UCard>
          <p class="text-xs text-muted">{{ t('sales.rangeNote', { from: date(data.from), to: date(new Date(new Date(data.to).getTime() - 1)) }) }}</p>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
