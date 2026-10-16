<script setup lang="ts">
/**
 * Shared lists (languages, levels, subjects...). Each list is the single source
 * for product fields, search filters and generated menu sections.
 */
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { l } = useL()
const toast = useToast()

const { data: lists, refresh } = await useFetch<any[]>('/api/admin/option-lists')

// Common flags for languages; any Iconify name can still be typed
const flags = ['iq', 'sa', 'ae', 'eg', 'gb', 'us', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'tr', 'ru', 'cn', 'jp', 'kr', 'ir', 'af', 'in', 'pk', 'gr', 'se', 'pl', 'ua', 'il', 'az', 'am', 'ge'].map(c => `i-circle-flags-${c}`)

const editing = ref<any>(null)
const open = ref(false)
const saving = ref(false)
const pickerFor = ref<number | null>(null)

function edit(list?: any) {
  editing.value = list
    ? { id: list.id, key: list.key, name: { ...list.name }, items: list.items.map((i: any) => ({ id: i.id, value: i.value, label: { ...i.label }, icon: i.icon ?? '', image: i.image })) }
    : { id: '', key: '', name: {}, items: [] }
  open.value = true
}
function addItem() {
  editing.value.items.push({ value: '', label: {}, icon: '' })
}
watch(() => editing.value?.items.map((i: any) => i.label?.en), () => {
  for (const i of editing.value?.items ?? []) if (!i.id && !i.valueTouched && i.label?.en) i.value = slugify(i.label.en)
})
function move(i: number, dir: -1 | 1) {
  const list = editing.value.items
  const j = i + dir
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j], list[i]]
}

async function save() {
  saving.value = true
  const { id, ...body } = editing.value
  body.items = body.items.map(({ valueTouched: _v, ...i }: any) => ({ ...i, icon: i.icon || null }))
  try {
    await $fetch(id ? `/api/admin/option-lists/${id}` : '/api/admin/option-lists', { method: id ? 'PUT' : 'POST', body })
    toast.add({ title: t('admin.saved'), color: 'success' })
    open.value = false
    await refresh()
  }
  catch (e: any) {
    toast.add({ title: t('admin.error'), description: e?.data?.message ?? e?.data?.data?.issues?.[0]?.message, color: 'error' })
  }
  finally { saving.value = false }
}
async function remove(list: any) {
  if (!confirm(t('admin.confirmDelete'))) return
  try {
    await $fetch(`/api/admin/option-lists/${list.id}`, { method: 'DELETE' })
    await refresh()
  }
  catch (e: any) {
    toast.add({ title: t('admin.error'), description: e?.data?.message, color: 'error' })
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('admin.lists')">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UButton icon="i-lucide-plus" :label="t('admin.list.new')" @click="edit()" /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UEmpty v-if="!lists?.length" icon="i-lucide-list" :title="t('admin.list.none')" />
      <div class="grid gap-4 lg:grid-cols-2">
        <UCard v-for="list in lists" :key="list.id">
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="font-bold">{{ l(list.name) }}</p>
                <p class="text-xs text-muted" dir="ltr">{{ list.key }}</p>
              </div>
              <div class="flex gap-1">
                <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" :aria-label="t('admin.edit')" @click="edit(list)" />
                <UButton icon="i-lucide-trash" size="xs" color="error" variant="ghost" :aria-label="t('admin.delete')" @click="remove(list)" />
              </div>
            </div>
          </template>
          <div class="flex flex-wrap gap-2">
            <UBadge v-for="i in list.items" :key="i.id" color="neutral" variant="soft" size="lg" class="gap-1.5"><OptionMark :option="{ icon: i.icon, image: i.imageUrl }" />{{ l(i.label) }}</UBadge>
          </div>
          <p v-if="list.attributes.length || list.sections.length" class="mt-4 text-xs text-muted">
            {{ t('admin.list.usedBy') }}:
            {{ [...list.attributes.map((a: any) => `${l(a.productType.name)} › ${l(a.name)}`), ...list.sections.map((s: any) => l(s.name))].join('، ') }}
          </p>
        </UCard>
      </div>

      <USlideover v-model:open="open" :title="editing?.id ? t('admin.edit') : t('admin.list.new')" :ui="{ content: 'max-w-2xl' }">
        <template #body>
          <form v-if="editing" id="list-form" class="space-y-4" @submit.prevent="save">
            <div class="grid gap-3 sm:grid-cols-[1fr_12rem]">
              <UFormField :label="t('admin.list.name')" required><AdminLocalizedInput v-model="editing.name" /></UFormField>
              <UFormField :label="t('admin.list.key')" required><UInput v-model="editing.key" dir="ltr" class="w-full" /></UFormField>
            </div>
            <p class="font-medium">{{ t('admin.list.items') }}</p>
            <div v-for="(item, i) in editing.items" :key="item.id ?? `new-${i}`" class="rounded-lg border border-default p-3 space-y-3">
              <div class="grid gap-3 sm:grid-cols-[1fr_12rem]">
                <UFormField :label="t('admin.list.label')"><AdminLocalizedInput v-model="item.label" /></UFormField>
                <UFormField :label="t('admin.list.value')"><UInput v-model="item.value" dir="ltr" class="w-full" @input="item.valueTouched = true" /></UFormField>
              </div>
              <div class="flex flex-wrap items-end gap-2">
                <UFormField :label="t('admin.list.icon')" :help="t('admin.list.iconHelp')" class="flex-1 min-w-48">
                  <UInput v-model="item.icon" dir="ltr" class="w-full" :leading-icon="item.icon || 'i-lucide-image'" />
                </UFormField>
                <UButton icon="i-lucide-flag" color="neutral" variant="outline" :label="t('admin.list.flags')" @click="pickerFor = pickerFor === Number(i) ? null : Number(i)" />
                <div class="flex gap-1">
                  <UButton icon="i-lucide-arrow-up" size="xs" color="neutral" variant="ghost" @click="move(Number(i), -1)" />
                  <UButton icon="i-lucide-arrow-down" size="xs" color="neutral" variant="ghost" @click="move(Number(i), 1)" />
                  <UButton icon="i-lucide-trash" size="xs" color="error" variant="ghost" @click="editing.items.splice(i, 1)" />
                </div>
              </div>
              <div v-if="pickerFor === Number(i)" class="flex flex-wrap gap-1">
                <UButton v-for="f in flags" :key="f" :icon="f" color="neutral" :variant="item.icon === f ? 'solid' : 'ghost'" size="lg" :aria-label="f" @click="item.icon = f; pickerFor = null" />
              </div>
            </div>
            <UButton icon="i-lucide-plus" color="neutral" variant="outline" :label="t('admin.list.addItem')" @click="addItem" />
          </form>
        </template>
        <template #footer>
          <div class="flex gap-2 justify-end w-full">
            <UButton color="neutral" variant="ghost" :label="t('admin.cancel')" @click="open = false" />
            <UButton type="submit" form="list-form" :loading="saving" :label="t('admin.save')" />
          </div>
        </template>
      </USlideover>
    </template>
  </UDashboardPanel>
</template>
