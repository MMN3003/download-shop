<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const route = useRoute()
const { t, locales } = useI18n()
const toast = useToast()
const localePath = useLocalePath()
const id = computed(() => String(route.params.id))
const isNew = computed(() => id.value === 'new')

const form = ref<any>({ slug: '', title: {}, excerpt: {}, body: {}, cover: null, coverUrl: null, status: 'draft', tags: [] as string[], productIds: [] as string[], seoTitle: {}, seoDesc: {} })
if (!isNew.value) {
  const { data, error } = await useFetch<any>(`/api/admin/blog/${id.value}`)
  if (error.value) throw createError({ statusCode: error.value.statusCode ?? 500, fatal: true })
  form.value = { ...form.value, ...data.value, excerpt: data.value.excerpt ?? {}, body: data.value.body ?? {}, seoTitle: data.value.seoTitle ?? {}, seoDesc: data.value.seoDesc ?? {}, slugTouched: true }
}
watch(() => form.value.title, (title) => {
  if (isNew.value && title?.en && !form.value.slugTouched) form.value.slug = slugify(title.en)
}, { deep: true })

/** Body as the server cleaned it; the preview never renders unsaved typing as HTML. */
const savedBody = ref<Record<string, string>>({ ...(form.value.body ?? {}) })
const tagInput = ref('')
function addTag() {
  const v = tagInput.value.trim()
  if (v && !form.value.tags.includes(v) && form.value.tags.length < 20) form.value.tags.push(v.slice(0, 40))
  tagInput.value = ''
}

const previewLang = ref(locales.value[0]!.code)
const saving = ref(false)
async function save(status?: string) {
  saving.value = true
  const f = form.value
  const body = { slug: f.slug, title: f.title, excerpt: f.excerpt, body: f.body, cover: f.cover || null, status: status ?? f.status, tags: f.tags, productIds: f.productIds, seoTitle: f.seoTitle, seoDesc: f.seoDesc }
  try {
    const p = await $fetch<any>(isNew.value ? '/api/admin/blog' : `/api/admin/blog/${id.value}`, { method: isNew.value ? 'POST' : 'PUT', body })
    // The server cleans the HTML; show what was actually saved
    form.value = { ...form.value, ...p, coverUrl: form.value.coverUrl, slugTouched: true }
    savedBody.value = { ...(p.body ?? {}) }
    toast.add({ title: t('admin.saved'), color: 'success' })
    if (isNew.value) await navigateTo(localePath(`/admin/blog/${p.id}`), { replace: true })
  }
  catch (err: any) { toast.add({ title: t('admin.error'), description: apiError(err), color: 'error' }) }
  finally { saving.value = false }
}

async function remove() {
  if (!confirm(t('admin.confirmDelete'))) return
  await $fetch(`/api/admin/blog/${id.value}`, { method: 'DELETE' })
  await navigateTo(localePath('/admin/blog'))
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="isNew ? t('blog.new') : t('admin.edit')">
        <template #leading><UButton icon="i-lucide-arrow-right" color="neutral" variant="ghost" class="ltr:rotate-180" :to="localePath('/admin/blog')" :aria-label="t('admin.blog')" /></template>
        <template #right>
          <UButton v-if="!isNew && form.status === 'published'" icon="i-lucide-external-link" color="neutral" variant="ghost" :to="localePath(`/blog/${form.slug}`)" target="_blank" />
          <UButton v-if="!isNew" icon="i-lucide-trash" color="error" variant="ghost" :aria-label="t('admin.delete')" @click="remove" />
          <UButton v-if="form.status !== 'published'" color="neutral" variant="outline" :loading="saving" :label="t('blog.saveDraft')" @click="save('draft')" />
          <UButton v-else color="neutral" variant="outline" :loading="saving" :label="t('blog.unpublish')" @click="save('draft')" />
          <UButton :loading="saving" :label="form.status === 'published' ? t('admin.save') : t('blog.publish')" icon="i-lucide-send" @click="save('published')" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div class="space-y-4">
          <UFormField :label="t('blog.postTitle')" required><AdminLocalizedInput v-model="form.title" /></UFormField>
          <UFormField :label="t('admin.section.slug')" required><UInput v-model="form.slug" dir="ltr" class="w-full" @input="form.slugTouched = true" /></UFormField>
          <UFormField :label="t('blog.excerpt')"><AdminLocalizedInput v-model="form.excerpt" textarea :rows="2" /></UFormField>
          <UFormField :label="t('blog.body')" :help="t('blog.htmlHelp')"><AdminLocalizedInput v-model="form.body" textarea :rows="14" /></UFormField>
          <UCard>
            <div class="flex items-center justify-between gap-2 mb-3">
              <p class="font-medium">{{ t('blog.preview') }}</p>
              <UTabs v-model="previewLang" :items="locales.map(x => ({ label: x.name, value: x.code }))" :content="false" size="xs" variant="link" />
            </div>
            <!-- Preview of saved, sanitised HTML only; unsaved text is shown as plain text -->
            <div v-if="!isNew" class="prose dark:prose-invert max-w-none leading-8" :dir="locales.find(x => x.code === previewLang)?.dir" v-html="savedBody[previewLang] ?? ''" />
            <p v-else class="text-sm text-muted">{{ t('blog.previewAfterSave') }}</p>
          </UCard>
        </div>
        <div class="space-y-4">
          <UFormField :label="t('blog.cover')"><AdminImageUpload v-model="form.cover" :url="form.coverUrl" /></UFormField>
          <UFormField :label="t('blog.tags')">
            <form class="flex gap-2" @submit.prevent="addTag">
              <UInput v-model="tagInput" class="flex-1" maxlength="40" />
              <UButton type="submit" icon="i-lucide-plus" color="neutral" variant="outline" :aria-label="t('admin.add')" />
            </form>
            <div v-if="form.tags.length" class="flex flex-wrap gap-1 mt-2">
              <UBadge v-for="(tag, i) in form.tags" :key="tag" color="neutral" variant="soft">
                <bdi>{{ tag }}</bdi>
                <UButton icon="i-lucide-x" size="xs" variant="link" color="neutral" :aria-label="t('admin.delete')" @click="form.tags.splice(i, 1)" />
              </UBadge>
            </div>
          </UFormField>
          <UFormField :label="t('blog.products')" :help="t('blog.productsHelp')"><AdminProductPicker v-model="form.productIds" :max="12" /></UFormField>
          <UFormField :label="t('admin.section.seoTitle')"><AdminLocalizedInput v-model="form.seoTitle" /></UFormField>
          <UFormField :label="t('admin.section.seoDesc')"><AdminLocalizedInput v-model="form.seoDesc" textarea :rows="2" /></UFormField>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
