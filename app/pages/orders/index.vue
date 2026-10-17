<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { t } = useI18n()
const { l, money, date, num } = useL()
const localePath = useLocalePath()
const { data: orders } = await useFetch<any[]>('/api/orders')
useSeoMeta({ title: () => t('order.list'), robots: 'noindex' })
</script>

<template>
  <UContainer class="py-8 max-w-3xl space-y-6">
    <h1 class="text-2xl font-extrabold">{{ t('order.list') }}</h1>
    <UEmpty v-if="!orders?.length" icon="i-lucide-receipt" :title="t('order.none')" />
    <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
      <ul class="divide-y divide-default">
        <li v-for="o in orders" :key="o.number">
          <NuxtLink :to="localePath(`/orders/${o.number}`)" class="flex items-center gap-4 p-4 hover:bg-elevated/50">
            <div class="flex-1 min-w-0">
              <p class="font-bold">{{ t('order.title', { n: num(o.number) }) }}</p>
              <p class="text-sm text-muted truncate">{{ o.items.map((i: any) => l(i.title)).join('، ') }}</p>
            </div>
            <div class="text-end space-y-1">
              <OrderStatus :status="o.status" />
              <p class="text-sm text-muted">{{ money(o.total) }} · {{ date(o.createdAt) }}</p>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </UCard>
  </UContainer>
</template>
