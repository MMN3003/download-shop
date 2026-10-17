<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const route = useRoute()
const { t } = useI18n()
const { l, num, money, date } = useL()
const localePath = useLocalePath()
const toast = useToast()
const requestFetch = useRequestFetch()
const id = String(route.params.id)
const { data: s, refresh } = await useAsyncData(`admin-seller-${id}`, () => requestFetch<any>(`/api/admin/sellers/${id}`))
const { data: sections } = await useFetch<any[]>('/api/admin/sections')

const note = ref(s.value?.reviewNote ?? '')
async function update(body: Record<string, unknown>) {
  try {
    await $fetch(`/api/admin/sellers/${id}`, { method: 'PUT', body: { ...body, reviewNote: note.value } })
    toast.add({ title: t('admin.saved'), color: 'success' })
    await refresh()
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
}

// Setting a rate, or answering a proposal with a counter-offer
const rate = reactive({ percent: null as number | null, scope: 'seller', sectionId: null as string | null, productId: null as string | null, startsAt: '', endsAt: '', note: '', direct: true, replyTo: null as string | null })
const rateCard = ref<HTMLElement>()
const scopeItems = computed(() => ['seller', 'section', 'product'].map(x => ({ label: t(`seller.scope.${x}`), value: x })))
const sectionItems = computed(() => buildSectionTree(sections.value ?? []).flat.map(x => ({ label: `${'— '.repeat(x.depth)}${l(x.name)}`, value: x.id })))
const productItems = computed(() => (s.value?.products ?? []).map((p: any) => ({ label: l(p.title), value: p.id })))
const busy = ref(false)
async function saveRate() {
  busy.value = true
  try {
    await $fetch(`/api/admin/sellers/${id}/agreements`, { method: 'POST', body: { ...rate, percent: Number(rate.percent), startsAt: rate.startsAt || null, endsAt: rate.endsAt || null } })
    toast.add({ title: t('admin.saved'), color: 'success' })
    Object.assign(rate, { percent: null, note: '', replyTo: null, direct: true, startsAt: '', endsAt: '' })
    await refresh()
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
  finally { busy.value = false }
}
async function act(agreementId: string, action: string) {
  if (action === 'counter') {
    const a = s.value.agreements.find((x: any) => x.id === agreementId)
    Object.assign(rate, { replyTo: agreementId, direct: false, scope: a.productId ? 'product' : a.sectionId ? 'section' : 'seller', sectionId: a.sectionId, productId: a.productId, percent: null })
    rateCard.value?.scrollIntoView({ behavior: 'smooth' })
    return
  }
  const answer = action === 'reject' ? prompt(t('admin.seller.why')) ?? '' : ''
  try {
    await $fetch(`/api/admin/agreements/${agreementId}`, { method: 'PUT', body: { action, answer } })
    toast.add({ title: t('admin.saved'), color: 'success' })
    await refresh()
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
}
const statusColor = (x: string) => ({ PUBLISHED: 'success', IN_REVIEW: 'warning', DRAFT: 'neutral', HIDDEN: 'error' } as any)[x]
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="s?.displayName">
        <template #leading><UButton icon="i-lucide-arrow-right" color="neutral" variant="ghost" class="ltr:rotate-180" :to="localePath('/admin/sellers')" /></template>
        <template #right><SellerStatus v-if="s" :status="s.status" /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div v-if="s" class="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div class="space-y-6 min-w-0">
          <div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <UCard><p class="text-sm text-muted">{{ t('seller.rate') }}</p><p class="text-xl font-extrabold">{{ num(s.rate.percent) }}٪</p></UCard>
            <UCard><p class="text-sm text-muted">{{ t('seller.totals.gross') }}</p><p class="text-xl font-extrabold">{{ money(s.totals.gross) }}</p></UCard>
            <UCard><p class="text-sm text-muted">{{ t('seller.totals.commission') }}</p><p class="text-xl font-extrabold">{{ money(s.totals.commission) }}</p></UCard>
            <UCard><p class="text-sm text-muted">{{ t('seller.available') }}</p><p class="text-xl font-extrabold">{{ money(s.balance.available) }}</p></UCard>
          </div>
          <UCard>
            <template #header><h2 class="font-bold">{{ t('seller.agreements') }}</h2></template>
            <AgreementList v-if="s.agreements.length" :items="s.agreements" viewer="store" @act="act" />
            <UEmpty v-else icon="i-lucide-percent" :title="t('seller.noAgreements')" />
          </UCard>
          <div ref="rateCard">
            <UCard>
              <template #header><h2 class="font-bold">{{ rate.replyTo ? t('admin.seller.counter') : t('admin.seller.setRate') }}</h2></template>
              <form class="space-y-4" @submit.prevent="saveRate">
                <div class="grid gap-4 sm:grid-cols-3">
                  <UFormField :label="t('seller.percent')" required><UInput v-model="rate.percent" type="number" min="0" max="100" step="0.5" dir="ltr" required class="w-full" /></UFormField>
                  <UFormField :label="t('seller.scopeLabel')"><USelect v-model="rate.scope" :items="scopeItems" class="w-full" /></UFormField>
                  <UFormField v-if="rate.scope === 'section'" :label="t('admin.product.sections')"><USelectMenu v-model="rate.sectionId" :items="sectionItems" value-key="value" class="w-full" /></UFormField>
                  <UFormField v-if="rate.scope === 'product'" :label="t('admin.products')"><USelectMenu v-model="rate.productId" :items="productItems" value-key="value" class="w-full" /></UFormField>
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                  <UFormField :label="t('seller.from')"><UInput v-model="rate.startsAt" type="date" dir="ltr" class="w-full" /></UFormField>
                  <UFormField :label="t('seller.until')" :help="t('admin.seller.noEnd')"><UInput v-model="rate.endsAt" type="date" dir="ltr" class="w-full" /></UFormField>
                </div>
                <UFormField :label="t('admin.seller.note')"><UTextarea v-model="rate.note" :rows="2" maxlength="1000" autoresize class="w-full" /></UFormField>
                <USwitch v-if="!rate.replyTo" v-model="rate.direct" :label="t('admin.seller.direct')" :description="rate.direct ? t('admin.seller.directHelp') : t('admin.seller.offerHelp')" />
                <div class="flex gap-2">
                  <UButton type="submit" icon="i-lucide-save" :loading="busy" :label="rate.direct && !rate.replyTo ? t('admin.seller.apply') : t('admin.seller.sendOffer')" />
                  <UButton v-if="rate.replyTo" color="neutral" variant="ghost" :label="t('admin.cancel')" @click="Object.assign(rate, { replyTo: null, direct: true })" />
                </div>
              </form>
            </UCard>
          </div>
          <UCard :ui="{ body: 'p-0 sm:p-0' }">
            <template #header><h2 class="font-bold">{{ t('admin.products') }}</h2></template>
            <ul class="divide-y divide-default text-sm">
              <li v-for="p in s.products" :key="p.id">
                <NuxtLink :to="localePath(`/admin/products/${p.id}`)" class="flex items-center gap-3 px-4 py-2 hover:bg-elevated/50">
                  <span class="flex-1 truncate">{{ l(p.title) }}</span>
                  <span class="text-muted">{{ t('seller.sales', { n: num(p.salesCount) }) }}</span>
                  <UBadge :color="statusColor(p.status)" variant="soft" size="sm">{{ t(`admin.product.statuses.${p.status}`) }}</UBadge>
                </NuxtLink>
              </li>
            </ul>
          </UCard>
        </div>

        <div class="space-y-6">
          <UCard>
            <template #header><h2 class="font-bold">{{ t('admin.seller.account') }}</h2></template>
            <div class="space-y-1 text-sm">
              <p class="font-medium">{{ s.user.name || '—' }}</p>
              <p v-if="s.user.phone" dir="ltr" class="text-end">{{ s.user.phone }}</p>
              <p v-if="s.user.email" dir="ltr" class="text-end">{{ s.user.email }}</p>
              <p class="text-muted"><NuxtLink :to="localePath(`/seller/${s.slug}`)" target="_blank" dir="ltr" class="underline">/seller/{{ s.slug }}</NuxtLink></p>
              <p class="text-muted">{{ t('admin.seller.termsAt') }}: {{ s.termsAt ? date(s.termsAt) : '—' }}</p>
              <p v-if="s.bio" class="whitespace-pre-line break-words pt-2" dir="auto">{{ s.bio }}</p>
            </div>
          </UCard>
          <UCard>
            <template #header><h2 class="font-bold">{{ t('admin.seller.decision') }}</h2></template>
            <div class="space-y-3">
              <UTextarea v-model="note" :rows="2" maxlength="1000" :placeholder="t('admin.seller.notePh')" autoresize class="w-full" />
              <div class="flex flex-wrap gap-2">
                <UButton v-if="s.status !== 'approved'" color="success" icon="i-lucide-check" :label="t('admin.seller.approve')" @click="update({ status: 'approved' })" />
                <UButton v-if="s.status === 'pending'" color="error" variant="soft" icon="i-lucide-x" :label="t('admin.seller.reject')" @click="update({ status: 'rejected' })" />
                <UButton v-if="s.status === 'approved'" color="error" variant="soft" icon="i-lucide-ban" :label="t('admin.seller.suspend')" @click="update({ status: 'suspended' })" />
              </div>
              <USwitch :model-value="s.trusted" :label="t('admin.seller.trusted')" :description="t('admin.seller.trustedHelp')" @update:model-value="v => update({ trusted: v })" />
            </div>
          </UCard>
          <UCard>
            <template #header><h2 class="font-bold">{{ t('seller.bank') }}</h2></template>
            <p class="text-sm" dir="ltr">{{ s.sheba || '—' }}</p>
            <p class="text-sm text-muted">{{ s.accountHolder }}</p>
          </UCard>
          <UCard v-if="s.payouts.length" :ui="{ body: 'p-0 sm:p-0' }">
            <template #header>
              <div class="flex justify-between items-center"><h2 class="font-bold">{{ t('seller.payouts') }}</h2><UButton size="xs" variant="ghost" :label="t('admin.payouts')" :to="localePath('/admin/payouts')" /></div>
            </template>
            <ul class="divide-y divide-default text-sm">
              <li v-for="p in s.payouts" :key="p.id" class="px-4 py-2 flex justify-between gap-2">
                <span>{{ money(p.amount) }}</span><span class="text-muted">{{ t(`seller.payoutStatus.${p.status}`) }} · {{ date(p.createdAt) }}</span>
              </li>
            </ul>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
