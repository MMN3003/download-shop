<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const route = useRoute()
const { t } = useI18n()
const { l } = useL()
const toast = useToast()
// Forwards the session cookie during server-side rendering
const requestFetch = useRequestFetch()
const localePath = useLocalePath()
const isNew = route.params.id === 'new'

const { data: plugins } = await useFetch<any[]>('/api/admin/plugins')
const { data: lists } = await useFetch<any[]>('/api/admin/option-lists')
const listItems = computed(() => [{ label: t('admin.type.ownOptions'), value: '__own' }, ...(lists.value ?? []).map(x => ({ label: l(x.name), value: x.id }))])
const form = ref<any>({ key: '', name: {}, description: {}, plugin: null, icon: '', enabled: true, attributes: [] })
if (!isNew) {
  const data = await requestFetch<any>(`/api/admin/product-types/${route.params.id}`)
  form.value = { ...data, attributes: data.attributes.map((a: any) => ({ ...a, options: a.options ?? [] })) }
}

const kinds = ['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTISELECT'] as const
const kindItems = computed(() => kinds.map(k => ({ label: t(`admin.type.kinds.${k}`), value: k })))
const pluginItems = computed(() => [{ label: t('admin.type.noPlugin'), value: '__none' }, ...(plugins.value ?? []).map(p => ({ label: l(p.name), value: p.key }))])
const currentPlugin = computed(() => plugins.value?.find(p => p.key === form.value.plugin))
const missingPluginFields = computed(() => (currentPlugin.value?.providesAttributes ?? []).filter((a: any) => !form.value.attributes.some((x: any) => x.key === a.key)))

function addField() {
  form.value.attributes.push({ key: '', name: {}, kind: 'TEXT', options: [], unit: {}, required: false, filterable: false, showAsBadge: false, autoFilled: false })
}
function addPluginFields() {
  for (const a of missingPluginFields.value) form.value.attributes.push({ ...a, options: [], unit: {}, required: false, filterable: false, showAsBadge: false, autoFilled: true })
}
function moveField(i: number, dir: -1 | 1) {
  const list = form.value.attributes
  const j = i + dir
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j], list[i]]
}

const saving = ref(false)
async function save() {
  saving.value = true
  const { id: _id, createdAt: _c, _count: _x, ...body } = form.value
  body.icon = body.icon || null
  body.attributes = body.attributes.map(({ id: _i, productTypeId: _p, sortOrder: _s, ...a }: any) => ({
    ...a, options: ['SELECT', 'MULTISELECT'].includes(a.kind) && !a.optionListId ? a.options : null,
  }))
  try {
    const saved = await $fetch<any>(isNew ? '/api/admin/product-types' : `/api/admin/product-types/${route.params.id}`, { method: isNew ? 'POST' : 'PUT', body })
    toast.add({ title: t('admin.saved'), color: 'success' })
    if (isNew) navigateTo(localePath(`/admin/types/${saved.id}`))
  }
  catch (e: any) {
    toast.add({ title: t('admin.error'), description: e?.data?.message ?? e?.data?.data?.issues?.[0]?.message, color: 'error' })
  }
  finally { saving.value = false }
}
async function remove() {
  if (!confirm(t('admin.confirmDelete'))) return
  try {
    await $fetch(`/api/admin/product-types/${route.params.id}`, { method: 'DELETE' })
    navigateTo(localePath('/admin/types'))
  }
  catch (e: any) {
    toast.add({ title: t('admin.error'), description: e?.data?.message, color: 'error' })
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="isNew ? t('admin.new') : l(form.name)">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton v-if="!isNew" color="error" variant="ghost" icon="i-lucide-trash" :label="t('admin.delete')" @click="remove" />
          <UButton icon="i-lucide-save" :loading="saving" :label="t('admin.save')" @click="save" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="max-w-4xl space-y-6">
        <UCard>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField :label="t('admin.type.name')" required class="sm:col-span-2"><AdminLocalizedInput v-model="form.name" /></UFormField>
            <UFormField :label="t('admin.type.key')" required><UInput v-model="form.key" dir="ltr" class="w-full" /></UFormField>
            <UFormField :label="t('admin.section.icon')" help="i-lucide-…"><UInput v-model="form.icon" dir="ltr" class="w-full" :leading-icon="form.icon || 'i-lucide-box'" /></UFormField>
            <UFormField :label="t('admin.type.plugin')">
              <USelect :model-value="form.plugin ?? '__none'" :items="pluginItems" class="w-full" @update:model-value="v => form.plugin = v === '__none' ? null : v" />
            </UFormField>
            <div class="flex items-end"><USwitch v-model="form.enabled" :label="t('admin.type.enabled')" /></div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <h2 class="font-bold">{{ t('admin.type.fields') }}</h2>
              <div class="flex gap-2">
                <UButton v-if="missingPluginFields.length" icon="i-lucide-sparkles" color="neutral" variant="outline" size="sm" :label="t('admin.type.addPluginFields')" @click="addPluginFields" />
                <UButton icon="i-lucide-plus" size="sm" :label="t('admin.type.addField')" @click="addField" />
              </div>
            </div>
          </template>
          <div class="space-y-4">
            <div v-for="(a, i) in form.attributes" :key="i" class="rounded-lg border border-default p-4 space-y-3">
              <div class="grid gap-3 sm:grid-cols-[1fr_1fr_10rem]">
                <UFormField :label="t('admin.type.fieldName')"><AdminLocalizedInput v-model="a.name" /></UFormField>
                <UFormField :label="t('admin.type.fieldKey')"><UInput v-model="a.key" dir="ltr" class="w-full" :disabled="a.autoFilled && !!currentPlugin?.providesAttributes.some((p: any) => p.key === a.key)" /></UFormField>
                <UFormField :label="t('admin.type.kind')"><USelect v-model="a.kind" :items="kindItems" class="w-full" /></UFormField>
              </div>
              <div v-if="a.kind === 'SELECT' || a.kind === 'MULTISELECT'" class="space-y-2">
                <UFormField :label="t('admin.type.optionSource')" :help="t('admin.type.optionSourceHelp')">
                  <USelect :model-value="a.optionListId ?? '__own'" :items="listItems" class="w-full sm:w-72" @update:model-value="v => a.optionListId = v === '__own' ? null : v" />
                </UFormField>
                <template v-if="a.optionListId">
                  <div class="flex flex-wrap gap-2">
                    <UBadge v-for="o in lists?.find(x => x.id === a.optionListId)?.items ?? []" :key="o.id" color="neutral" variant="soft"><OptionMark :option="{ icon: o.icon, image: o.imageUrl }" />{{ l(o.label) }}</UBadge>
                  </div>
                  <USwitch v-model="a.linksSections" :label="t('admin.type.linksSections')" :description="t('admin.type.linksSectionsHelp')" />
                </template>
                <template v-else>
                  <p class="text-sm font-medium">{{ t('admin.type.options') }}</p>
                  <div v-for="(o, j) in a.options" :key="j" class="grid gap-2 grid-cols-[8rem_1fr_auto] items-start">
                    <UInput v-model="o.value" dir="ltr" :placeholder="t('admin.type.optionValue')" />
                    <AdminLocalizedInput v-model="o.label" />
                    <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="a.options.splice(j, 1)" />
                  </div>
                  <UButton icon="i-lucide-plus" size="xs" color="neutral" variant="outline" :label="t('admin.type.addOption')" @click="a.options.push({ value: '', label: {} })" />
                </template>
              </div>
              <UFormField v-if="a.kind === 'NUMBER'" :label="t('admin.type.unit')"><AdminLocalizedInput v-model="a.unit" /></UFormField>
              <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
                <UCheckbox v-model="a.required" :label="t('admin.type.required')" />
                <UCheckbox v-model="a.filterable" :label="t('admin.type.filterable')" />
                <UCheckbox v-model="a.showAsBadge" :label="t('admin.type.badge')" />
                <UCheckbox v-model="a.autoFilled" :label="t('admin.type.auto')" />
                <div class="ms-auto flex gap-1">
                  <UButton icon="i-lucide-arrow-up" size="xs" color="neutral" variant="ghost" @click="moveField(Number(i), -1)" />
                  <UButton icon="i-lucide-arrow-down" size="xs" color="neutral" variant="ghost" @click="moveField(Number(i), 1)" />
                  <UButton icon="i-lucide-trash" size="xs" color="error" variant="ghost" @click="form.attributes.splice(i, 1)" />
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
