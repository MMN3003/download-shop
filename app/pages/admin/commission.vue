<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { l, num, date } = useL()
const toast = useToast()
const { data, refresh } = await useFetch<any>('/api/seller/agreements')
const [{ data: sections }, { data: products }] = await Promise.all([
  useFetch<any[]>('/api/admin/sections'),
  useFetch<any>('/api/admin/products', { query: { perPage: 100 } }),
])
const form = reactive({ percent: null as number | null, scope: 'seller', sectionId: null as string | null, productId: null as string | null, note: '' })
const scopeItems = computed(() => ['seller', 'section', 'product'].map(s => ({ label: t(`seller.scope.${s}`), value: s })))
const sectionItems = computed(() => buildSectionTree(sections.value ?? []).flat.map(s => ({ label: `${'— '.repeat(s.depth)}${l(s.name)}`, value: s.id })))
const productItems = computed(() => (products.value?.items ?? []).map((p: any) => ({ label: l(p.title), value: p.id })))
const busy = ref(false)

async function propose() {
  busy.value = true
  try {
    await $fetch('/api/seller/agreements', { method: 'POST', body: { ...form, percent: Number(form.percent) } })
    toast.add({ title: t('seller.proposed'), color: 'success' })
    Object.assign(form, { percent: null, note: '' })
    await refresh()
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
  finally { busy.value = false }
}
async function act(id: string, action: string) {
  try {
    await $fetch(`/api/seller/agreements/${id}`, { method: 'PUT', body: { action } })
    toast.add({ title: t('admin.saved'), color: 'success' })
    await refresh()
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
}
</script>

<template>
  <UDashboardPanel>
    <template #header><UDashboardNavbar :title="t('seller.commission')"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar></template>
    <template #body>
      <div v-if="data" class="grid gap-6 lg:grid-cols-[1fr_22rem] max-w-5xl">
        <div class="space-y-6 min-w-0">
          <UCard>
            <p class="text-sm text-muted">{{ t('seller.rate') }}</p>
            <p class="text-3xl font-extrabold">{{ num(data.rate.percent) }}٪</p>
            <p class="text-sm text-muted mt-1">
              {{ data.rate.isDefault ? t('seller.rateDefault') : t('seller.rateAgreed') }}
              <span v-if="data.rate.endsAt">· {{ t('seller.rateEnds', { date: date(data.rate.endsAt) }) }}</span>
            </p>
            <p class="text-xs text-muted mt-3">{{ t('seller.rateHelp') }}</p>
          </UCard>
          <UCard>
            <template #header><h2 class="font-bold">{{ t('seller.agreements') }}</h2></template>
            <AgreementList v-if="data.items.length" :items="data.items" viewer="seller" @act="act" />
            <UEmpty v-else icon="i-lucide-percent" :title="t('seller.noAgreements')" />
          </UCard>
        </div>
        <UCard class="self-start">
          <template #header><h2 class="font-bold">{{ t('seller.propose') }}</h2></template>
          <form class="space-y-4" @submit.prevent="propose">
            <UFormField :label="t('seller.percent')" required><UInput v-model="form.percent" type="number" min="0" max="100" step="0.5" dir="ltr" required class="w-full" /></UFormField>
            <UFormField :label="t('seller.scopeLabel')"><USelect v-model="form.scope" :items="scopeItems" class="w-full" /></UFormField>
            <UFormField v-if="form.scope === 'section'" :label="t('admin.product.sections')"><USelectMenu v-model="form.sectionId" :items="sectionItems" value-key="value" class="w-full" /></UFormField>
            <UFormField v-if="form.scope === 'product'" :label="t('admin.products')"><USelectMenu v-model="form.productId" :items="productItems" value-key="value" class="w-full" /></UFormField>
            <UFormField :label="t('seller.proposeNote')"><UTextarea v-model="form.note" :rows="3" maxlength="1000" autoresize class="w-full" /></UFormField>
            <UButton type="submit" icon="i-lucide-send" :loading="busy" :disabled="form.percent === null || String(form.percent) === ''" :label="t('seller.send')" />
          </form>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
