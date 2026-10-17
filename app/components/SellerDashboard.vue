<script setup lang="ts">
const { t } = useI18n()
const { num, money, date } = useL()
const localePath = useLocalePath()
const { data } = await useFetch<any>('/api/seller/me')
const count = (s: string) => data.value?.products.find((p: any) => p.status === s)?._count ?? 0
const cards = computed(() => data.value?.balance ? [
  { label: t('seller.available'), value: money(data.value.balance.available), icon: 'i-lucide-wallet', cls: 'bg-success/10 text-success', to: '/admin/earnings' },
  { label: t('seller.held', { n: num(data.value.balance.holdDays) }), value: money(data.value.balance.held), icon: 'i-lucide-hourglass', cls: 'bg-warning/10 text-warning', to: '/admin/earnings' },
  { label: t('seller.rate'), value: `${num(data.value.rate.percent)}٪`, icon: 'i-lucide-percent', cls: 'bg-primary/10 text-primary', to: '/admin/commission' },
] : [])
const statuses = ['PUBLISHED', 'IN_REVIEW', 'DRAFT', 'HIDDEN']
</script>

<template>
  <div v-if="data?.seller" class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-3">
      <NuxtLink v-for="c in cards" :key="c.label" :to="localePath(c.to)">
        <UCard>
          <div class="flex items-center gap-3">
            <span class="grid place-items-center size-10 rounded-lg" :class="c.cls"><UIcon :name="c.icon" class="size-5" /></span>
            <div><p class="text-sm text-muted">{{ c.label }}</p><p class="text-2xl font-extrabold">{{ c.value }}</p></div>
          </div>
        </UCard>
      </NuxtLink>
    </div>
    <p v-if="data.rate && !data.rate.isDefault && data.rate.endsAt" class="text-sm text-muted">{{ t('seller.rateEnds', { date: date(data.rate.endsAt) }) }}</p>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-bold">{{ t('admin.products') }}</h2>
          <UButton icon="i-lucide-plus" size="sm" :label="t('admin.add')" :to="localePath('/admin/products/new')" />
        </div>
      </template>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NuxtLink v-for="s in statuses" :key="s" :to="localePath(`/admin/products?status=${s}`)" class="rounded-lg bg-elevated p-3 hover:bg-accented/50">
          <p class="text-sm text-muted">{{ t(`admin.product.statuses.${s}`) }}</p>
          <p class="text-xl font-extrabold">{{ num(count(s)) }}</p>
        </NuxtLink>
      </div>
      <p class="text-sm text-muted mt-4">{{ data.seller.trusted ? t('seller.trustedNote') : t('seller.reviewNote') }}</p>
    </UCard>
    <UAlert v-if="!data.seller.sheba" color="warning" variant="soft" icon="i-lucide-landmark" :title="t('seller.noSheba')" :actions="[{ label: t('seller.shop'), to: localePath('/admin/shop') }]" />
  </div>
</template>
