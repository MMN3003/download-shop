<script setup lang="ts">
/** Choose which blocks the home page shows, in what order and with which titles. */
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { l } = useL()
const toast = useToast()
const localePath = useLocalePath()

const { data } = await useFetch<any[]>('/api/admin/home')
const { data: sections } = await useFetch<any[]>('/api/admin/sections')
const sectionItems = computed(() => buildSectionTree(sections.value ?? []).flat.map(s => ({ label: `${'— '.repeat(s.depth)}${l(s.name)}`, value: s.id })))
const blocks = ref<any[]>((data.value ?? []).map(b => ({ ...b, title: b.title ?? {} })))

const types = ['sections', 'featured', 'newest', 'popular', 'free', 'section', 'bundles', 'blog', 'banner', 'how'] as const
const icons: Record<string, string> = { sections: 'i-lucide-folder-tree', featured: 'i-lucide-star', newest: 'i-lucide-sparkles', popular: 'i-lucide-flame', free: 'i-lucide-gift', section: 'i-lucide-folder', bundles: 'i-lucide-package-plus', blog: 'i-lucide-newspaper', banner: 'i-lucide-image', how: 'i-lucide-list-ordered' }
const hasLimit = (type: string) => ['featured', 'newest', 'popular', 'free', 'section', 'bundles', 'blog'].includes(type)
// Built-in blocks appear once; sections and banners can repeat
const addable = computed(() => types.filter(x => ['section', 'banner'].includes(x) || !blocks.value.some(b => b.type === x)).map(x => ({ label: t(`homeBuilder.types.${x}`), icon: icons[x], onSelect: () => add(x) })))

function add(type: string) {
  blocks.value.push({ id: `${type}-${Math.random().toString(36).slice(2, 8)}`, type, enabled: true, title: {}, sectionId: null, image: null, imageUrl: null, link: '' })
}
function move(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= blocks.value.length) return
  const next = [...blocks.value]
  ;[next[i], next[j]] = [next[j]!, next[i]!]
  blocks.value = next
}

const saving = ref(false)
async function save() {
  saving.value = true
  try {
    const body = blocks.value.map(b => ({
      id: b.id, type: b.type, enabled: b.enabled,
      title: Object.values(b.title ?? {}).some(Boolean) ? b.title : null,
      sectionId: b.type === 'section' ? b.sectionId : null,
      image: b.type === 'banner' ? b.image : null,
      link: b.type === 'banner' ? (b.link || null) : null,
      ...(hasLimit(b.type) && b.limit ? { limit: Number(b.limit) } : {}),
    }))
    await $fetch('/api/admin/home', { method: 'PUT', body: { blocks: body } })
    toast.add({ title: t('admin.saved'), color: 'success' })
  }
  catch (err: any) {
    const issue = err?.data?.data?.issues?.[0]
    const n = issue?.path?.[1]
    toast.add({ title: t('admin.error'), description: typeof n === 'number' ? `${t(`homeBuilder.types.${blocks.value[n]?.type}`)}: ${issue.message}` : apiError(err), color: 'error' })
  }
  finally { saving.value = false }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('admin.home')">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton icon="i-lucide-external-link" color="neutral" variant="ghost" :to="localePath('/')" target="_blank" :aria-label="t('admin.viewStore')" />
          <UDropdownMenu :items="addable"><UButton icon="i-lucide-plus" color="neutral" variant="outline" :label="t('homeBuilder.add')" /></UDropdownMenu>
          <UButton :loading="saving" :label="t('admin.save')" @click="save" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">{{ t('homeBuilder.help') }}</p>
        <UCard v-for="(b, i) in blocks" :key="b.id" :class="!b.enabled && 'opacity-60'">
          <div class="flex items-center gap-3">
            <UIcon :name="icons[b.type] ?? 'i-lucide-square'" class="size-5 text-primary" />
            <p class="flex-1 font-bold">{{ l(b.title) || t(`homeBuilder.types.${b.type}`) }}</p>
            <USwitch v-model="b.enabled" :aria-label="t('homeBuilder.show')" />
            <UButton icon="i-lucide-arrow-up" size="xs" color="neutral" variant="ghost" :disabled="i === 0" :aria-label="t('admin.section.up')" @click="move(i, -1)" />
            <UButton icon="i-lucide-arrow-down" size="xs" color="neutral" variant="ghost" :disabled="i === blocks.length - 1" :aria-label="t('admin.section.down')" @click="move(i, 1)" />
            <UButton icon="i-lucide-trash" size="xs" color="error" variant="ghost" :aria-label="t('admin.delete')" @click="blocks.splice(i, 1)" />
          </div>
          <div v-if="b.enabled" class="mt-4 grid gap-4 md:grid-cols-2">
            <UFormField v-if="b.type !== 'how'" :label="t('homeBuilder.title')" :help="t('homeBuilder.titleHelp')" class="md:col-span-2"><AdminLocalizedInput v-model="b.title" /></UFormField>
            <UFormField v-if="b.type === 'section'" :label="t('homeBuilder.section')" required>
              <USelect v-model="b.sectionId" :items="sectionItems" class="w-full" />
            </UFormField>
            <UFormField v-if="hasLimit(b.type)" :label="t('homeBuilder.limit')">
              <UInput v-model.number="b.limit" type="number" min="1" max="24" :placeholder="['bundles'].includes(b.type) ? '6' : b.type === 'blog' ? '3' : '8'" dir="ltr" class="w-full" />
            </UFormField>
            <template v-if="b.type === 'banner'">
              <UFormField :label="t('homeBuilder.image')" required><AdminImageUpload v-model="b.image" :url="b.imageUrl" /></UFormField>
              <UFormField :label="t('homeBuilder.link')" :help="t('homeBuilder.linkHelp')"><UInput v-model="b.link" dir="ltr" class="w-full" placeholder="/s/arabic" /></UFormField>
            </template>
          </div>
        </UCard>
        <UEmpty v-if="!blocks.length" icon="i-lucide-layout-template" :title="t('homeBuilder.empty')" />
      </div>
    </template>
  </UDashboardPanel>
</template>
