<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const route = useRoute()
const { t, locale } = useI18n()
const { l, money, date, num } = useL()
const localePath = useLocalePath()
const toast = useToast()
const requestFetch = useRequestFetch()
const { user } = useUserSession()
const isOwner = computed(() => (user.value as any)?.role === 'OWNER')

const { data: order, refresh } = await useAsyncData(`admin-order-${route.params.id}`, () => requestFetch<any>(`/api/admin/orders/${route.params.id}`))
const dt = (d: string) => d ? new Intl.DateTimeFormat(locale.value === 'fa' ? 'fa-IR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d)) : ''

const busy = ref('')
const rejecting = ref<any>(null)
const reason = ref('')

async function approve(p: any) {
  busy.value = p.id
  try {
    await $fetch(`/api/admin/payments/${p.id}/approve`, { method: 'POST' })
    toast.add({ title: t('admin.order.approved'), color: 'success' })
    await refresh()
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
  finally { busy.value = '' }
}
async function reject() {
  busy.value = rejecting.value.id
  try {
    await $fetch(`/api/admin/payments/${rejecting.value.id}/reject`, { method: 'POST', body: { reason: reason.value } })
    toast.add({ title: t('admin.order.rejectedMsg'), color: 'success' })
    rejecting.value = null
    reason.value = ''
    await refresh()
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
  finally { busy.value = '' }
}
async function refund() {
  if (!confirm(t('admin.order.refundConfirm'))) return
  await $fetch(`/api/admin/orders/${order.value.id}/refund`, { method: 'POST', body: {} })
  await refresh()
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="order ? `${t('admin.order.number')} #${num(order.number)}` : ''">
        <template #leading><UButton icon="i-lucide-arrow-right" color="neutral" variant="ghost" class="ltr:rotate-180" :to="localePath('/admin/orders')" /></template>
        <template #right>
          <OrderStatus v-if="order" :status="order.status" />
          <UButton v-if="order?.status === 'PAID' && isOwner" color="error" variant="soft" icon="i-lucide-undo-2" :label="t('admin.order.refund')" @click="refund" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div v-if="order" class="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div class="space-y-6 min-w-0">
          <UCard v-for="p in order.payments" :key="p.id" :class="p.status === 'SUBMITTED' ? 'ring-2 ring-info' : ''">
            <template #header>
              <div class="flex items-center justify-between gap-2">
                <p class="font-bold">{{ l(p.methodName) }} · {{ money(p.amount) }}</p>
                <UBadge :color="({ PAID: 'success', SUBMITTED: 'info', REJECTED: 'error', FAILED: 'error', STARTED: 'neutral' } as any)[p.status]" variant="soft">{{ t(`admin.order.paymentStatus.${p.status}`) }}</UBadge>
              </div>
            </template>
            <div class="grid gap-4 md:grid-cols-[14rem_1fr]">
              <a v-if="p.hasReceipt" :href="`/api/admin/payments/${p.id}/receipt`" target="_blank" class="block rounded-lg border border-default overflow-hidden bg-elevated" :title="t('admin.order.openReceipt')">
                <div v-if="p.receiptIsPdf" class="h-40 grid place-items-center"><UIcon name="i-lucide-file-text" class="size-12 text-muted" /></div>
                <img v-else :src="`/api/admin/payments/${p.id}/receipt`" alt="" class="w-full max-h-72 object-contain">
              </a>
              <dl class="text-sm space-y-2">
                <div class="flex justify-between gap-3"><dt class="text-muted">{{ t('admin.order.expected') }}</dt><dd class="font-bold">{{ money(order.total) }}</dd></div>
                <div v-if="p.reference" class="flex justify-between gap-3"><dt class="text-muted">{{ t('admin.order.reference') }}</dt><dd dir="ltr" class="font-mono">{{ p.reference }}</dd></div>
                <div v-if="p.payerCard4" class="flex justify-between gap-3"><dt class="text-muted">{{ t('admin.order.card4') }}</dt><dd dir="ltr" class="font-mono">{{ p.payerCard4 }}</dd></div>
                <div v-if="p.transferredAt" class="flex justify-between gap-3"><dt class="text-muted">{{ t('admin.order.transferredAt') }}</dt><dd>{{ dt(p.transferredAt) }}</dd></div>
                <div v-if="p.refId" class="flex justify-between gap-3"><dt class="text-muted">{{ t('admin.order.gatewayRef') }}</dt><dd dir="ltr" class="font-mono">{{ p.refId }} {{ p.cardPan }}</dd></div>
                <div class="flex justify-between gap-3"><dt class="text-muted">{{ t('admin.order.submittedAt') }}</dt><dd>{{ dt(p.createdAt) }}</dd></div>
                <p v-if="p.rejectReason" class="text-error">{{ p.rejectReason }}</p>
                <UAlert v-for="(w, i) in p.warnings" :key="i" color="warning" variant="soft" icon="i-lucide-triangle-alert"
                        :title="w.kind === 'duplicateReference' ? t('admin.order.dupRef', { n: w.orderNumber }) : t('admin.order.dupReceipt', { n: w.orderNumber })" />
              </dl>
            </div>
            <template v-if="p.status === 'SUBMITTED'" #footer>
              <div class="flex gap-2 justify-end">
                <UButton color="error" variant="soft" icon="i-lucide-x" :label="t('admin.order.reject')" @click="rejecting = p" />
                <UButton color="success" icon="i-lucide-check" :loading="busy === p.id" :label="t('admin.order.approve')" @click="approve(p)" />
              </div>
            </template>
          </UCard>
          <UEmpty v-if="!order.payments.length" icon="i-lucide-hourglass" :title="t('order.status.PENDING_PAYMENT')" />
        </div>

        <div class="space-y-4">
          <UCard>
            <template #header><p class="font-bold">{{ t('admin.order.buyer') }}</p></template>
            <p class="font-medium">{{ order.user.name || '—' }}</p>
            <p v-if="order.user.phone" dir="ltr" class="text-sm text-end">{{ order.user.phone }}</p>
            <p v-if="order.user.email" dir="ltr" class="text-sm text-end">{{ order.user.email }}</p>
            <p class="text-xs text-muted mt-2">{{ t('admin.order.previousPaid', { n: num(order.previousPaid) }) }}</p>
          </UCard>
          <UCard>
            <template #header><p class="font-bold">{{ t('admin.order.items') }}</p></template>
            <ul class="space-y-3 text-sm">
              <li v-for="i in order.items" :key="i.id">
                <NuxtLink :to="localePath(`/p/${i.product.slug}`)" target="_blank" class="font-medium hover:text-primary">{{ l(i.title) }}</NuxtLink>
                <p class="text-muted">{{ money(i.unitPrice) }}<template v-if="order.status === 'PAID'"> · {{ t('admin.order.commission') }} {{ money(i.commission) }} ({{ num(i.commissionPercent) }}٪)</template></p>
              </li>
            </ul>
            <template #footer><div class="flex justify-between font-bold"><span>{{ t('admin.order.total') }}</span><span>{{ money(order.total) }}</span></div></template>
          </UCard>
          <p class="text-xs text-muted">{{ t('admin.order.date') }}: {{ date(order.createdAt) }}</p>
        </div>
      </div>

      <UModal :open="!!rejecting" :title="t('admin.order.rejectTitle')" @update:open="v => !v && (rejecting = null)">
        <template #body>
          <UFormField :label="t('admin.order.reason')"><UTextarea v-model="reason" :rows="3" autoresize class="w-full" /></UFormField>
        </template>
        <template #footer>
          <div class="flex gap-2 justify-end w-full">
            <UButton color="neutral" variant="ghost" :label="t('admin.cancel')" @click="rejecting = null" />
            <UButton color="error" :disabled="reason.trim().length < 3" :loading="!!busy" :label="t('admin.order.reject')" @click="reject" />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
