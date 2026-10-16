<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { l, num } = useL()
const toast = useToast()
const localePath = useLocalePath()

const { data: sections, refresh } = await useFetch<any[]>('/api/admin/sections')
const tree = computed(() => buildSectionTree(sections.value ?? []).flat)

const empty = () => ({ id: '', slug: '', name: {}, description: {}, icon: '', banner: null, bannerUrl: null, seoTitle: {}, seoDesc: {}, showOnHome: false, sortOrder: 0, parentId: null as string | null })
const editing = ref<any>(null)
const open = ref(false)
const saving = ref(false)

function edit(s?: any, parentId?: string) {
  editing.value = s ? { ...empty(), ...s } : { ...empty(), parentId: parentId ?? null }
  open.value = true
}

// Parent choices exclude the section itself and its descendants
const parentItems = computed(() => {
  const banned = new Set<string>()
  if (editing.value?.id) {
    banned.add(editing.value.id)
    for (const s of tree.value) if (s.parentId && banned.has(s.parentId)) banned.add(s.id)
  }
  return [{ label: t('admin.section.noParent'), value: '__none' }, ...tree.value.filter(s => !banned.has(s.id)).map(s => ({ label: `${'— '.repeat(s.depth)}${l(s.name)}`, value: s.id }))]
})

watch(() => editing.value?.name, (name) => {
  if (editing.value && !editing.value.id && name?.en && !editing.value.slugTouched) editing.value.slug = slugify(name.en)
}, { deep: true })

async function save() {
  saving.value = true
  const { id, bannerUrl: _b, productCount: _c, _count: _x, createdAt: _ca, updatedAt: _u, slugTouched: _s, ...body } = editing.value
  try {
    await $fetch(id ? `/api/admin/sections/${id}` : '/api/admin/sections', { method: id ? 'PUT' : 'POST', body: { ...body, icon: body.icon || null } })
    toast.add({ title: t('admin.saved'), color: 'success' })
    open.value = false
    await refresh()
  }
  catch (e: any) {
    toast.add({ title: t('admin.error'), description: e?.data?.message, color: 'error' })
  }
  finally { saving.value = false }
}

async function remove(s: any) {
  if (!confirm(t('admin.confirmDelete'))) return
  await $fetch(`/api/admin/sections/${s.id}`, { method: 'DELETE' })
  await refresh()
}

/** Swap a section with its sibling above/below. */
async function move(s: any, dir: -1 | 1) {
  const siblings = tree.value.filter(x => x.parentId === s.parentId)
  const i = siblings.findIndex(x => x.id === s.id)
  const j = i + dir
  if (j < 0 || j >= siblings.length) return
  const order = [...siblings]
  ;[order[i], order[j]] = [order[j]!, order[i]!]
  await $fetch('/api/admin/sections/reorder', { method: 'POST', body: { items: order.map((x, k) => ({ id: x.id, parentId: x.parentId, sortOrder: k })) } })
  await refresh()
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('admin.sections')">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UButton icon="i-lucide-plus" :label="t('admin.add')" @click="edit()" /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <ul class="divide-y divide-default">
          <li v-for="s in tree" :key="s.id" class="flex items-center gap-3 px-4 py-3" :style="{ paddingInlineStart: `${1 + s.depth * 1.75}rem` }">
            <UIcon :name="s.icon || 'i-lucide-folder'" class="size-5 text-primary shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ l(s.name) }}</p>
              <p class="text-xs text-muted" dir="ltr">/s/{{ s.slug }}</p>
            </div>
            <UBadge v-if="s.showOnHome" color="primary" variant="soft" size="sm">{{ t('admin.section.showOnHome') }}</UBadge>
            <span class="text-sm text-muted w-16 text-center">{{ num(s.productCount) }}</span>
            <div class="flex gap-1">
              <UButton icon="i-lucide-arrow-up" size="xs" color="neutral" variant="ghost" :aria-label="t('admin.section.up')" @click="move(s, -1)" />
              <UButton icon="i-lucide-arrow-down" size="xs" color="neutral" variant="ghost" :aria-label="t('admin.section.down')" @click="move(s, 1)" />
              <UButton icon="i-lucide-folder-plus" size="xs" color="neutral" variant="ghost" :aria-label="t('admin.add')" @click="edit(undefined, s.id)" />
              <UButton icon="i-lucide-external-link" size="xs" color="neutral" variant="ghost" :to="localePath(`/s/${s.slug}`)" target="_blank" />
              <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" :aria-label="t('admin.edit')" @click="edit(s)" />
              <UButton icon="i-lucide-trash" size="xs" color="error" variant="ghost" :aria-label="t('admin.delete')" @click="remove(s)" />
            </div>
          </li>
        </ul>
      </UCard>

      <USlideover v-model:open="open" :title="editing?.id ? t('admin.edit') : t('admin.new')" :ui="{ content: 'max-w-xl' }">
        <template #body>
          <form v-if="editing" id="section-form" class="space-y-4" @submit.prevent="save">
            <UFormField :label="t('admin.section.name')" required><AdminLocalizedInput v-model="editing.name" /></UFormField>
            <UFormField :label="t('admin.section.slug')" required>
              <UInput v-model="editing.slug" dir="ltr" class="w-full" @input="editing.slugTouched = true" />
            </UFormField>
            <UFormField :label="t('admin.section.parent')">
              <USelect :model-value="editing.parentId ?? '__none'" :items="parentItems" class="w-full" @update:model-value="v => editing.parentId = v === '__none' ? null : v" />
            </UFormField>
            <UFormField :label="t('admin.section.icon')" help="i-lucide-…">
              <UInput v-model="editing.icon" dir="ltr" class="w-full" :leading-icon="editing.icon || 'i-lucide-folder'" />
            </UFormField>
            <UFormField :label="t('admin.section.description')"><AdminLocalizedInput v-model="editing.description" textarea /></UFormField>
            <UFormField :label="t('admin.section.banner')"><AdminImageUpload v-model="editing.banner" :url="editing.bannerUrl" /></UFormField>
            <USwitch v-model="editing.showOnHome" :label="t('admin.section.showOnHome')" />
            <UFormField :label="t('admin.section.seoTitle')"><AdminLocalizedInput v-model="editing.seoTitle" /></UFormField>
            <UFormField :label="t('admin.section.seoDesc')"><AdminLocalizedInput v-model="editing.seoDesc" textarea :rows="2" /></UFormField>
          </form>
        </template>
        <template #footer>
          <div class="flex gap-2 justify-end w-full">
            <UButton color="neutral" variant="ghost" :label="t('admin.cancel')" @click="open = false" />
            <UButton type="submit" form="section-form" :loading="saving" :label="t('admin.save')" />
          </div>
        </template>
      </USlideover>
    </template>
  </UDashboardPanel>
</template>
