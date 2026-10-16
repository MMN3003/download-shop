<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const route = useRoute()
const { t, locale } = useI18n()
const { l, money, date, num } = useL()
const localePath = useLocalePath()
const toast = useToast()

const { data: order, refresh, error } = await useFetch<any>(() => `/api/orders/${route.params.number}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 500, fatal: true })

const unpaid = computed(() => ['PENDING_PAYMENT', 'REJECTED'].includes(order.value.status))
const method = ref<string>(order.value?.paymentMethod ?? order.value?.methods[0]?.key ?? '')
const current = computed(() => order.value.methods.find((m: any) => m.key === method.value))
const lastRejected = computed(() => order.value.status === 'REJECTED' ? order.value.payments.find((p: any) => p.status === 'REJECTED') : null)
const paidRef = computed(() => order.value.payments.find((p: any) => p.status === 'PAID' && p.refId)?.refId)

async function copy(text: string) {
  await navigator.clipboard.writeText(text)
  toast.add({ title: t('order.copied'), icon: 'i-lucide-check', duration: 1500 })
}
const group = (s: string, n: number) => s.replace(new RegExp(`(.{${n}})(?=.)`, 'g'), '$1 ')

const busy = ref(false)
async function payOnline() {
  busy.value = true
  try {
    const r = await $fetch<any>(`/api/orders/${order.value.number}/pay`, { method: 'POST', body: { method: method.value, locale: locale.value } })
    if (/^https?:\/\//.test(r.next)) window.location.href = r.next
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
  finally { busy.value = false }
}

const receipt = reactive({ file: null as File | null, reference: '', payerCard4: '', transferredAt: '' })
async function sendReceipt() {
  if (!receipt.file) return
  busy.value = true
  const fd = new FormData()
  fd.append('receipt', receipt.file)
  fd.append('method', method.value)
  fd.append('reference', receipt.reference)
  fd.append('payerCard4', receipt.payerCard4)
  fd.append('transferredAt', new Date(receipt.transferredAt).toISOString())
  try {
    await $fetch(`/api/orders/${order.value.number}/receipt`, { method: 'POST', body: fd })
    toast.add({ title: t('order.receiptSent'), color: 'success' })
    await refresh()
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
  finally { busy.value = false }
}
async function cancel() {
  if (!confirm(t('order.cancelConfirm'))) return
  await $fetch(`/api/orders/${order.value.number}/cancel`, { method: 'POST' })
  await refresh()
}
useSeoMeta({ title: () => t('order.title', { n: order.value?.number }), robots: 'noindex' })
</script>

<template>
  <UContainer v-if="order" class="py-8 max-w-3xl space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-extrabold">{{ t('order.title', { n: num(order.number) }) }}</h1>
      <OrderStatus :status="order.status" />
    </div>

    <UAlert v-if="route.query.paid && order.status === 'PAID'" color="success" variant="subtle" icon="i-lucide-circle-check" :title="t('order.paid')" :actions="[{ label: t('order.toLibrary'), to: localePath('/library') }]" />
    <UAlert v-else-if="order.status === 'PAID'" color="success" variant="subtle" icon="i-lucide-circle-check" :title="t('order.status.PAID')" :description="paidRef ? `${t('order.refId')}: ${paidRef}` : undefined" :actions="[{ label: t('order.toLibrary'), to: localePath('/library') }]" />
    <UAlert v-if="route.query.failed && unpaid" color="error" variant="subtle" icon="i-lucide-circle-x" :title="t('order.failed')" />
    <UAlert v-if="order.status === 'AWAITING_VERIFICATION'" color="info" variant="subtle" icon="i-lucide-hourglass" :title="t('order.waiting')" />
    <UAlert v-if="lastRejected" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="t('order.rejected', { reason: lastRejected.rejectReason })" />

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <ul class="divide-y divide-default">
        <li v-for="i in order.items" :key="i.productId" class="flex items-center gap-4 p-4">
          <NuxtLink :to="localePath(`/p/${i.slug}`)" class="flex-1 font-medium hover:text-primary">{{ l(i.title) }}</NuxtLink>
          <span>{{ money(i.unitPrice) }}</span>
        </li>
        <li class="flex justify-between p-4 font-extrabold"><span>{{ t('order.total') }}</span><span>{{ money(order.total) }}</span></li>
      </ul>
    </UCard>

    <UCard v-if="unpaid">
      <div class="space-y-5">
        <UFormField :label="t('order.payWith')">
          <URadioGroup v-model="method" orientation="horizontal" variant="card" :items="order.methods.map((m: any) => ({ value: m.key, label: l(m.name) }))" />
        </UFormField>

        <UButton v-if="current?.kind === 'online'" block size="xl" icon="i-lucide-lock" :loading="busy" :label="t('cart.pay', { amount: money(order.total) })" @click="payOnline" />

        <template v-else-if="current">
          <div class="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3">
            <p class="font-bold">{{ t('order.transferTitle', { amount: money(order.total) }) }}</p>
            <div v-if="current.info.cardNumber" class="flex items-center justify-between gap-2">
              <span class="text-sm text-muted">{{ t('order.cardNumber') }}</span>
              <span class="flex items-center gap-1"><span dir="ltr" class="font-mono sm:text-lg tracking-wider whitespace-nowrap">{{ group(current.info.cardNumber, 4) }}</span><UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" :aria-label="t('order.copy')" @click="copy(current.info.cardNumber)" /></span>
            </div>
            <div v-if="current.info.sheba" class="flex items-center justify-between gap-2">
              <span class="text-sm text-muted">{{ t('order.sheba') }}</span>
              <span class="flex items-center gap-1"><span dir="ltr" class="font-mono text-sm sm:text-base">{{ group(current.info.sheba, 4) }}</span><UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" :aria-label="t('order.copy')" @click="copy(current.info.sheba)" /></span>
            </div>
            <div v-if="current.info.holder" class="flex justify-between gap-2"><span class="text-sm text-muted">{{ t('order.holder') }}</span><span class="font-medium">{{ current.info.holder }}</span></div>
            <div v-if="current.info.bank" class="flex justify-between gap-2"><span class="text-sm text-muted">{{ t('order.bank') }}</span><span class="font-medium">{{ current.info.bank }}</span></div>
            <div class="flex justify-between gap-2"><span class="text-sm text-muted">{{ t('order.total') }}</span><span class="flex items-center gap-1 font-bold">{{ money(order.total) }}<UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" :aria-label="t('order.copy')" @click="copy(String(order.total))" /></span></div>
          </div>

          <form class="space-y-4" @submit.prevent="sendReceipt">
            <p class="font-bold">{{ t('order.receiptTitle') }}</p>
            <UFormField :label="t('order.receipt')" required>
              <UFileUpload v-model="receipt.file" accept="image/*,application/pdf" class="w-full min-h-36" :label="t('order.receipt')" />
            </UFormField>
            <div class="grid gap-3 sm:grid-cols-2">
              <UFormField :label="t('order.reference')" required><UInput v-model="receipt.reference" dir="ltr" inputmode="numeric" class="w-full" required minlength="4" /></UFormField>
              <UFormField v-if="method === 'card'" :label="t('order.card4')"><UInput v-model="receipt.payerCard4" dir="ltr" inputmode="numeric" maxlength="4" class="w-full" /></UFormField>
              <UFormField :label="t('order.transferredAt')" required><UInput v-model="receipt.transferredAt" type="datetime-local" dir="ltr" class="w-full" required /></UFormField>
            </div>
            <UButton type="submit" block size="lg" icon="i-lucide-send" :loading="busy" :disabled="!receipt.file" :label="t('order.submitReceipt')" />
          </form>
        </template>
        <UButton color="neutral" variant="link" :label="t('order.cancel')" @click="cancel" />
      </div>
    </UCard>
    <p class="text-sm text-muted">{{ t('order.date') }}: {{ date(order.createdAt) }}</p>
  </UContainer>
</template>
