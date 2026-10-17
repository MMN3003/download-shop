<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { l, num, money, date } = useL()
const toast = useToast()

const { data: coupons, refresh } = await useFetch<any[]>('/api/admin/coupons')
const { data: sections } = await useFetch<any[]>('/api/admin/sections')
const sectionItems = computed(() => [{ label: t('coupon.allProducts'), value: '__none' }, ...buildSectionTree(sections.value ?? []).flat.map(s => ({ label: `${'— '.repeat(s.depth)}${l(s.name)}`, value: s.id }))])

const day = (d: string | null) => d ? new Date(d).toISOString().slice(0, 10) : ''
const empty = () => ({ id: '', code: '', kind: 'PERCENT', value: 10, minTotal: 0, maxUses: null as number | null, perUser: 1, startsAt: '', endsAt: '', sectionId: null as string | null, productId: null as string | null, active: true, note: '' })
const editing = ref<any>(null)
const open = ref(false)
const saving = ref(false)

function edit(c?: any) {
  editing.value = c ? { ...empty(), ...c, startsAt: day(c.startsAt), endsAt: day(c.endsAt), note: c.note ?? '' } : empty()
  open.value = true
}

async function save() {
  saving.value = true
  const e = editing.value
  const body = {
    code: e.code, kind: e.kind, value: Number(e.value), minTotal: Number(e.minTotal) || 0, maxUses: e.maxUses ? Number(e.maxUses) : null,
    perUser: Number(e.perUser) || 1, startsAt: e.startsAt || null, endsAt: e.endsAt ? `${e.endsAt}T23:59:59` : null,
    sectionId: e.sectionId, productId: e.productId, active: e.active, note: e.note || null,
  }
  try {
    await $fetch(e.id ? `/api/admin/coupons/${e.id}` : '/api/admin/coupons', { method: e.id ? 'PUT' : 'POST', body })
    toast.add({ title: t('admin.saved'), color: 'success' })
    open.value = false
    await refresh()
  }
  catch (err: any) { toast.add({ title: t('admin.error'), description: apiError(err), color: 'error' }) }
  finally { saving.value = false }
}

async function remove(c: any) {
  if (!confirm(t('admin.confirmDelete'))) return
  try {
    await $fetch(`/api/admin/coupons/${c.id}`, { method: 'DELETE' })
    await refresh()
  }
  catch (err: any) { toast.add({ title: apiError(err), color: 'error' }) }
}

const valueLabel = (c: any) => c.kind === 'PERCENT' ? t('coupon.percentValue', { n: num(c.value) }) : money(c.value)
const state = (c: any) => {
  const now = Date.now()
  if (!c.active) return { label: t('coupon.state.off'), color: 'neutral' as const }
  if (c.endsAt && new Date(c.endsAt).getTime() <= now) return { label: t('coupon.state.expired'), color: 'neutral' as const }
  if (c.maxUses != null && c.usedCount >= c.maxUses) return { label: t('coupon.state.usedUp'), color: 'neutral' as const }
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: t('coupon.state.scheduled'), color: 'info' as const }
  return { label: t('coupon.state.live'), color: 'success' as const }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('admin.coupons')">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UButton icon="i-lucide-plus" :label="t('admin.add')" @click="edit()" /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UEmpty v-if="!coupons?.length" icon="i-lucide-ticket-percent" :title="t('coupon.none')" class="py-10" />
      <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
        <ul class="divide-y divide-default">
          <li v-for="c in coupons" :key="c.id" class="flex flex-wrap items-center gap-3 px-4 py-3">
            <div class="flex-1 min-w-48">
              <p class="font-mono font-bold" dir="ltr">{{ c.code }}</p>
              <p class="text-xs text-muted">
                {{ valueLabel(c) }}
                · {{ c.product ? l(c.product.title) : c.section ? l(c.section.name) : t('coupon.allProducts') }}
                <template v-if="c.minTotal"> · {{ t('coupon.minShort', { min: money(c.minTotal) }) }}</template>
                <template v-if="c.endsAt"> · {{ t('coupon.until', { d: date(c.endsAt) }) }}</template>
              </p>
              <p v-if="c.note" class="text-xs text-muted break-words" dir="auto">{{ c.note }}</p>
            </div>
            <UBadge :color="state(c).color" variant="soft" size="sm">{{ state(c).label }}</UBadge>
            <span class="text-sm text-muted">{{ t('coupon.used', { n: num(c.usedCount), max: c.maxUses ? num(c.maxUses) : '∞' }) }}</span>
            <span class="text-sm text-muted">{{ t('coupon.given', { amount: money(c.discountGiven) }) }}</span>
            <div class="flex gap-1">
              <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" :aria-label="t('admin.edit')" @click="edit(c)" />
              <UButton v-if="!c.usedCount" icon="i-lucide-trash" size="xs" color="error" variant="ghost" :aria-label="t('admin.delete')" @click="remove(c)" />
            </div>
          </li>
        </ul>
      </UCard>

      <USlideover v-model:open="open" :title="editing?.id ? t('admin.edit') : t('admin.new')" :ui="{ content: 'max-w-xl' }">
        <template #body>
          <form v-if="editing" id="coupon-form" class="space-y-4" @submit.prevent="save">
            <UFormField :label="t('coupon.code')" :help="t('coupon.codeHelp')" required>
              <UInput v-model="editing.code" dir="ltr" class="w-full font-mono" maxlength="40" @update:model-value="v => editing.code = String(v).toUpperCase()" />
            </UFormField>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField :label="t('coupon.kind')">
                <USelect v-model="editing.kind" :items="[{ label: t('coupon.percent'), value: 'PERCENT' }, { label: t('coupon.amount'), value: 'AMOUNT' }]" class="w-full" />
              </UFormField>
              <UFormField :label="t('coupon.value')" required>
                <UInput v-model.number="editing.value" type="number" min="1" :max="editing.kind === 'PERCENT' ? 100 : undefined" dir="ltr" class="w-full" />
              </UFormField>
            </div>
            <UFormField :label="t('coupon.scope')">
              <USelect :model-value="editing.sectionId ?? '__none'" :items="sectionItems" class="w-full" :disabled="!!editing.productId" @update:model-value="v => editing.sectionId = v === '__none' ? null : v" />
            </UFormField>
            <UFormField :label="t('coupon.product')" :help="t('coupon.productHelp')">
              <AdminProductPicker v-model="editing.productId" single @update:model-value="v => v && (editing.sectionId = null)" />
            </UFormField>
            <div class="grid gap-4 sm:grid-cols-3">
              <UFormField :label="t('coupon.minTotal')"><UInput v-model.number="editing.minTotal" type="number" min="0" dir="ltr" class="w-full" /></UFormField>
              <UFormField :label="t('coupon.maxUses')" :help="t('coupon.maxUsesHelp')"><UInput v-model.number="editing.maxUses" type="number" min="1" dir="ltr" class="w-full" /></UFormField>
              <UFormField :label="t('coupon.perUser')"><UInput v-model.number="editing.perUser" type="number" min="1" dir="ltr" class="w-full" /></UFormField>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField :label="t('coupon.startsAt')"><UInput v-model="editing.startsAt" type="date" dir="ltr" class="w-full" /></UFormField>
              <UFormField :label="t('coupon.endsAt')"><UInput v-model="editing.endsAt" type="date" dir="ltr" class="w-full" /></UFormField>
            </div>
            <UFormField :label="t('coupon.note')"><UTextarea v-model="editing.note" :rows="2" maxlength="500" autoresize class="w-full" /></UFormField>
            <USwitch v-model="editing.active" :label="t('coupon.active')" />
            <p class="text-xs text-muted">{{ t('coupon.bundleNote') }}</p>
          </form>
        </template>
        <template #footer>
          <div class="flex gap-2 justify-end w-full">
            <UButton color="neutral" variant="ghost" :label="t('admin.cancel')" @click="open = false" />
            <UButton type="submit" form="coupon-form" :loading="saving" :label="t('admin.save')" />
          </div>
        </template>
      </USlideover>
    </template>
  </UDashboardPanel>
</template>
