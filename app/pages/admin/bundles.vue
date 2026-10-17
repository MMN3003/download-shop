<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { l, num, money } = useL()
const toast = useToast()
const localePath = useLocalePath()

const { data: bundles, refresh } = await useFetch<any[]>('/api/admin/bundles')
const empty = () => ({ id: '', slug: '', title: {}, description: {}, cover: null as string | null, coverUrl: null as string | null, price: 0, active: true, sortOrder: 0, productIds: [] as string[] })
const editing = ref<any>(null)
const open = ref(false)
const saving = ref(false)

function edit(b?: any) {
  editing.value = b ? { ...empty(), ...b, cover: b.coverKey, coverUrl: b.cover } : empty()
  open.value = true
}
watch(() => editing.value?.title, (title) => {
  if (editing.value && !editing.value.id && title?.en && !editing.value.slugTouched) editing.value.slug = slugify(title.en)
}, { deep: true })

async function save() {
  saving.value = true
  const e = editing.value
  const body = { slug: e.slug, title: e.title, description: e.description, cover: e.cover || null, price: Number(e.price) || 0, active: e.active, sortOrder: Number(e.sortOrder) || 0, productIds: e.productIds }
  try {
    await $fetch(e.id ? `/api/admin/bundles/${e.id}` : '/api/admin/bundles', { method: e.id ? 'PUT' : 'POST', body })
    toast.add({ title: t('admin.saved'), color: 'success' })
    open.value = false
    await refresh()
  }
  catch (err: any) { toast.add({ title: t('admin.error'), description: apiError(err), color: 'error' }) }
  finally { saving.value = false }
}

async function remove(b: any) {
  if (!confirm(t('admin.confirmDelete'))) return
  try {
    await $fetch(`/api/admin/bundles/${b.id}`, { method: 'DELETE' })
    await refresh()
  }
  catch (err: any) { toast.add({ title: apiError(err), color: 'error' }) }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('admin.bundles')">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UButton icon="i-lucide-plus" :label="t('admin.add')" @click="edit()" /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UEmpty v-if="!bundles?.length" icon="i-lucide-package-plus" :title="t('bundle.none')" :description="t('bundle.help')" class="py-10" />
      <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
        <ul class="divide-y divide-default">
          <li v-for="b in bundles" :key="b.id" class="flex flex-wrap items-center gap-3 px-4 py-3">
            <div class="flex-1 min-w-48">
              <p class="font-bold">{{ l(b.title) }}</p>
              <p class="text-xs text-muted">
                {{ t('bundle.items', { n: num(b.products.length) }) }} · {{ money(b.price) }}
                <del>{{ money(b.listPrice) }}</del>
                · {{ t('bundle.sold', { n: num(b.soldLines) }) }}
              </p>
            </div>
            <UBadge v-if="!b.active" color="neutral" variant="soft" size="sm">{{ t('coupon.state.off') }}</UBadge>
            <UBadge v-else-if="b.products.length < 2" color="warning" variant="soft" size="sm">{{ t('bundle.tooFew') }}</UBadge>
            <div class="flex gap-1">
              <UButton icon="i-lucide-external-link" size="xs" color="neutral" variant="ghost" :to="localePath(`/b/${b.slug}`)" target="_blank" />
              <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" :aria-label="t('admin.edit')" @click="edit(b)" />
              <UButton icon="i-lucide-trash" size="xs" color="error" variant="ghost" :aria-label="t('admin.delete')" @click="remove(b)" />
            </div>
          </li>
        </ul>
      </UCard>

      <USlideover v-model:open="open" :title="editing?.id ? t('admin.edit') : t('admin.new')" :ui="{ content: 'max-w-xl' }">
        <template #body>
          <form v-if="editing" id="bundle-form" class="space-y-4" @submit.prevent="save">
            <UFormField :label="t('bundle.name')" required><AdminLocalizedInput v-model="editing.title" /></UFormField>
            <UFormField :label="t('admin.section.slug')" required>
              <UInput v-model="editing.slug" dir="ltr" class="w-full" @input="editing.slugTouched = true" />
            </UFormField>
            <UFormField :label="t('bundle.products')" :help="t('bundle.productsHelp')" required>
              <AdminProductPicker v-model="editing.productIds" :max="50" />
            </UFormField>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField :label="t('bundle.price')" required><UInput v-model.number="editing.price" type="number" min="0" dir="ltr" class="w-full" /></UFormField>
              <UFormField :label="t('bundle.sortOrder')"><UInput v-model.number="editing.sortOrder" type="number" dir="ltr" class="w-full" /></UFormField>
            </div>
            <UFormField :label="t('admin.section.description')" :help="t('blog.htmlHelp')"><AdminLocalizedInput v-model="editing.description" textarea :rows="4" /></UFormField>
            <UFormField :label="t('bundle.cover')"><AdminImageUpload v-model="editing.cover" :url="editing.coverUrl" /></UFormField>
            <USwitch v-model="editing.active" :label="t('coupon.active')" />
            <p class="text-xs text-muted">{{ t('bundle.splitNote') }}</p>
          </form>
        </template>
        <template #footer>
          <div class="flex gap-2 justify-end w-full">
            <UButton color="neutral" variant="ghost" :label="t('admin.cancel')" @click="open = false" />
            <UButton type="submit" form="bundle-form" :loading="saving" :label="t('admin.save')" />
          </div>
        </template>
      </USlideover>
    </template>
  </UDashboardPanel>
</template>
