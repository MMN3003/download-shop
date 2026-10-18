<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const route = useRoute()
const { t, locales } = useI18n()
const { l, date, bytes } = useL()
const toast = useToast()
// Forwards the session cookie during server-side rendering
const requestFetch = useRequestFetch()
const localePath = useLocalePath()
const isNew = computed(() => route.params.id === 'new')

const [{ data: types }, { data: sections }] = await Promise.all([
  useFetch<any[]>('/api/admin/product-types'),
  useFetch<any[]>('/api/admin/sections'),
])

const blank = () => ({
  slug: '', productTypeId: types.value?.[0]?.id ?? '', status: 'DRAFT', featured: false,
  title: {}, shortDesc: {}, description: {}, learnPoints: {}, cover: null, coverUrl: null, screenshots: [] as string[], screenshotUrls: [] as string[],
  price: 0, salePrice: null, saleStartsAt: null, saleEndsAt: null, isFree: false,
  seoTitle: {}, seoDesc: {}, tags: [] as string[], sectionIds: [] as string[], attributes: {} as Record<string, any>,
  files: [] as any[], previews: [] as any[], id: '',
})
const form = ref<any>(blank())

async function load() {
  if (isNew.value) return
  const p = await requestFetch<any>(`/api/admin/products/${route.params.id}`)
  form.value = { ...blank(), ...p, saleStartsAt: p.saleStartsAt?.slice(0, 16) ?? null, saleEndsAt: p.saleEndsAt?.slice(0, 16) ?? null }
}
await load()

const type = computed(() => types.value?.find(x => x.id === form.value.productTypeId))
const manualFields = computed(() => (type.value?.attributes ?? []).filter((a: any) => !a.autoFilled))
const autoFields = computed(() => (type.value?.attributes ?? []).filter((a: any) => a.autoFilled))
const typeItems = computed(() => (types.value ?? []).map(x => ({ label: l(x.name), value: x.id })))
const sectionItems = computed(() => buildSectionTree(sections.value ?? []).flat.map(s => ({ label: `${'— '.repeat(s.depth)}${l(s.name)}`, value: s.id })))
const { user } = useUserSession()
const isSeller = computed(() => (user.value as any)?.role === 'SELLER')
const { data: me } = await useFetch<any>('/api/seller/me', { immediate: isSeller.value })
// Untrusted sellers send products for review instead of publishing them
const trusted = computed(() => !isSeller.value || me.value?.seller?.trusted)
const statusItems = computed(() => ['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'HIDDEN']
  .filter(s => trusted.value || s !== 'PUBLISHED' || form.value.status === 'PUBLISHED')
  .map(s => ({ label: t(isSeller.value && s === 'IN_REVIEW' ? 'seller.sendForReview' : `admin.product.statuses.${s}`), value: s })))
const optionItems = (a: any) => (a.options ?? []).map((o: any) => ({ label: l(o.label), value: o.value }))

// learnPoints are stored per language as arrays; edited as one item per line
const learnText = computed({
  get: () => Object.fromEntries(Object.entries(form.value.learnPoints ?? {}).map(([k, v]) => [k, (v as string[]).join('\n')])),
  set: (v: Record<string, string>) => { form.value.learnPoints = Object.fromEntries(Object.entries(v).map(([k, s]) => [k, s.split('\n').map(x => x.trim()).filter(Boolean)])) },
})
const tagsText = computed({
  get: () => form.value.tags.join('، '),
  set: (v: string) => { form.value.tags = v.split(/[,،]/).map(x => x.trim()).filter(Boolean) },
})

let slugTouched = !isNew.value
watch(() => form.value.title?.en, (en) => { if (!slugTouched && en) form.value.slug = slugify(en) })

const saving = ref(false)
async function save() {
  saving.value = true
  const f = form.value
  const body = {
    slug: f.slug, productTypeId: f.productTypeId, status: f.status, featured: f.featured,
    title: f.title, shortDesc: f.shortDesc, description: f.description, learnPoints: f.learnPoints,
    cover: f.cover, screenshots: f.screenshots, price: Number(f.price) || 0,
    salePrice: f.salePrice === '' || f.salePrice == null ? null : Number(f.salePrice),
    saleStartsAt: f.saleStartsAt || null, saleEndsAt: f.saleEndsAt || null, isFree: f.isFree,
    seoTitle: f.seoTitle, seoDesc: f.seoDesc, tags: f.tags, sectionIds: f.sectionIds,
    attributes: Object.fromEntries(manualFields.value.map((a: any) => [a.key, f.attributes[a.key] ?? null])),
  }
  try {
    const saved = await $fetch<any>(isNew.value ? '/api/admin/products' : `/api/admin/products/${route.params.id}`, { method: isNew.value ? 'POST' : 'PUT', body })
    toast.add({ title: t('admin.saved'), color: 'success' })
    if (isNew.value) await navigateTo(localePath(`/admin/products/${saved.id}`))
    else await load()
  }
  catch (e: any) {
    const issue = e?.data?.data?.issues?.[0]
    toast.add({ title: t('admin.error'), description: issue ? `${issue.path?.join('.')}: ${apiError(e)}` : apiError(e), color: 'error' })
  }
  finally { saving.value = false }
}

async function remove() {
  if (!confirm(t('admin.confirmDelete'))) return
  try {
    await $fetch(`/api/admin/products/${route.params.id}`, { method: 'DELETE' })
    navigateTo(localePath('/admin/products'))
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
}

// Review queue (staff)
const review = reactive({ note: '', busy: false })
async function decide(action: 'approve' | 'reject') {
  review.busy = true
  try {
    await $fetch(`/api/admin/products/${route.params.id}/review`, { method: 'PUT', body: { action, note: review.note } })
    toast.add({ title: t('admin.saved'), color: 'success' })
    review.note = ''
    await load()
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
  finally { review.busy = false }
}

// Files
const upload = reactive({ kind: 'MAIN', version: '1.0', changelog: '', busy: false })
const fileInput = ref<HTMLInputElement>()
const kindItems = computed(() => ['MAIN', 'SAMPLE', 'EXTRA'].map(k => ({ label: t(`admin.product.kinds.${k}`), value: k })))
async function uploadFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  upload.busy = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('kind', upload.kind)
    fd.append('version', upload.version)
    fd.append('changelog', upload.changelog)
    const res = await $fetch<any>(`/api/admin/products/${route.params.id}/files`, { method: 'POST', body: fd })
    toast.add({ title: res.analysis ? t('admin.product.analyzed', { n: res.analysis.previews }) : t('admin.saved'), color: 'success' })
    upload.changelog = ''
    await load()
  }
  catch (err: any) {
    toast.add({ title: t('admin.error'), description: apiError(err), color: 'error' })
  }
  finally {
    upload.busy = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
async function deleteFile(id: string) {
  if (!confirm(t('admin.confirmDelete'))) return
  await $fetch(`/api/admin/products/${route.params.id}/files/${id}`, { method: 'DELETE' })
  await load()
}

// Screenshots: add uploaded keys to the list
const newShot = ref<string | null>(null)
watch(newShot, (k) => {
  if (!k) return
  form.value.screenshots.push(k)
  form.value.screenshotUrls.push(`/media/${k}`)
  newShot.value = null
})
function removeShot(i: number) {
  form.value.screenshots.splice(i, 1)
  form.value.screenshotUrls.splice(i, 1)
}
const fmt = useAttrFormat()
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="isNew ? t('admin.new') : l(form.title)">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton v-if="!isNew && form.status === 'PUBLISHED'" color="neutral" variant="ghost" icon="i-lucide-external-link" :label="t('admin.product.view')" :to="localePath(`/p/${form.slug}`)" target="_blank" />
          <UButton v-if="!isNew" color="error" variant="ghost" icon="i-lucide-trash" :aria-label="t('admin.delete')" @click="remove" />
          <UButton icon="i-lucide-save" :loading="saving" :label="t('admin.save')" @click="save" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="grid gap-6 xl:grid-cols-[1fr_22rem] max-w-6xl">
        <div class="space-y-6 min-w-0">
          <UCard>
            <template #header><h2 class="font-bold">{{ t('admin.product.basics') }}</h2></template>
            <div class="space-y-4">
              <UFormField :label="t('admin.product.title')" required><AdminLocalizedInput v-model="form.title" /></UFormField>
              <div class="grid gap-4 sm:grid-cols-2">
                <UFormField :label="t('admin.product.slug')" required><UInput v-model="form.slug" dir="ltr" class="w-full" @input="slugTouched = true" /></UFormField>
                <UFormField :label="t('admin.product.type')" required><USelect v-model="form.productTypeId" :items="typeItems" class="w-full" /></UFormField>
              </div>
              <UFormField :label="t('admin.product.sections')"><USelectMenu v-model="form.sectionIds" :items="sectionItems" value-key="value" multiple class="w-full" /></UFormField>
              <UFormField :label="t('admin.product.shortDesc')"><AdminLocalizedInput v-model="form.shortDesc" textarea :rows="2" /></UFormField>
              <UFormField :label="t('admin.product.description')"><AdminLocalizedInput v-model="form.description" textarea :rows="6" /></UFormField>
              <UFormField :label="t('admin.product.learnPoints')"><AdminLocalizedInput v-model="learnText" textarea :rows="4" /></UFormField>
              <UFormField :label="t('admin.product.tags')"><UInput v-model="tagsText" class="w-full" /></UFormField>
            </div>
          </UCard>

          <UCard v-if="type">
            <template #header><h2 class="font-bold">{{ t('admin.product.fields') }} · {{ l(type.name) }}</h2></template>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField v-for="a in manualFields" :key="a.key" :label="l(a.name)" :required="a.required">
                <USelect v-if="a.kind === 'SELECT'" v-model="form.attributes[a.key]" :items="optionItems(a)" class="w-full" />
                <USelectMenu v-else-if="a.kind === 'MULTISELECT'" :model-value="form.attributes[a.key] ?? []" :items="optionItems(a)" value-key="value" multiple class="w-full" @update:model-value="v => form.attributes[a.key] = v" />
                <USwitch v-else-if="a.kind === 'BOOLEAN'" v-model="form.attributes[a.key]" />
                <UInput v-else-if="a.kind === 'NUMBER'" v-model.number="form.attributes[a.key]" type="number" class="w-full" />
                <UInput v-else v-model="form.attributes[a.key]" class="w-full" />
              </UFormField>
            </div>
            <div v-if="autoFields.length" class="mt-6">
              <p class="text-sm text-muted flex items-center gap-1 mb-2"><UIcon name="i-lucide-sparkles" />{{ t('admin.product.autoHint') }}</p>
              <dl class="grid gap-2 sm:grid-cols-3 text-sm">
                <div v-for="a in autoFields.filter((x: any) => x.key !== 'subdecks')" :key="a.key" class="rounded-lg bg-elevated p-3">
                  <dt class="text-muted">{{ l(a.name) }}</dt>
                  <dd class="font-bold">{{ fmt(a, form.attributes[a.key]) || '—' }}</dd>
                </div>
              </dl>
            </div>
          </UCard>

          <UCard>
            <template #header><h2 class="font-bold">{{ t('admin.product.files') }}</h2></template>
            <p v-if="isNew" class="text-sm text-muted">{{ t('admin.product.saveFirst') }}</p>
            <div v-else class="space-y-4">
              <div class="grid gap-3 sm:grid-cols-[10rem_7rem_1fr_auto] items-end">
                <UFormField :label="t('admin.product.fileKind')"><USelect v-model="upload.kind" :items="kindItems" class="w-full" /></UFormField>
                <UFormField :label="t('admin.product.version')"><UInput v-model="upload.version" dir="ltr" class="w-full" /></UFormField>
                <UFormField :label="t('admin.product.changelog')"><UInput v-model="upload.changelog" class="w-full" /></UFormField>
                <div>
                  <input ref="fileInput" type="file" class="hidden" @change="uploadFile">
                  <UButton icon="i-lucide-upload" :loading="upload.busy" :label="upload.busy ? t('admin.product.uploading') : t('admin.product.upload')" @click="fileInput?.click()" />
                </div>
              </div>
              <ul class="divide-y divide-default rounded-lg border border-default">
                <li v-for="f in form.files" :key="f.id" class="flex items-center gap-3 px-3 py-2 text-sm">
                  <UIcon name="i-lucide-file" class="text-primary" />
                  <div class="flex-1 min-w-0">
                    <p class="truncate" dir="ltr">{{ f.filename }}</p>
                    <p class="text-xs text-muted">{{ t(`admin.product.kinds.${f.kind}`) }} · v{{ f.version }} · <span dir="ltr">{{ bytes(f.size) }}</span> · {{ date(f.createdAt) }}<span v-if="f.changelog"> · {{ f.changelog }}</span></p>
                  </div>
                  <UBadge v-if="f.isCurrent" color="success" variant="soft" size="sm">{{ t('admin.product.current') }}</UBadge>
                  <UButton icon="i-lucide-trash" size="xs" color="error" variant="ghost" @click="deleteFile(f.id)" />
                </li>
              </ul>
            </div>
          </UCard>

          <UCard v-if="form.previews.length">
            <template #header><h2 class="font-bold">{{ t('admin.product.previews') }}</h2></template>
            <ProductPreviews :previews="form.previews" />
          </UCard>

          <UCard>
            <template #header><h2 class="font-bold">{{ t('admin.product.seo') }}</h2></template>
            <div class="space-y-4">
              <UFormField :label="t('admin.section.seoTitle')"><AdminLocalizedInput v-model="form.seoTitle" /></UFormField>
              <UFormField :label="t('admin.section.seoDesc')"><AdminLocalizedInput v-model="form.seoDesc" textarea :rows="2" /></UFormField>
            </div>
          </UCard>
        </div>

        <div class="space-y-6">
          <UAlert v-if="form.reviewNote" color="error" variant="soft" icon="i-lucide-message-square-warning" :title="t('seller.changesNeeded')">
            <template #description><p class="whitespace-pre-line break-words" dir="auto">{{ form.reviewNote }}</p></template>
          </UAlert>
          <UCard v-if="!isSeller && form.status === 'IN_REVIEW' && !isNew" :ui="{ root: 'ring-2 ring-warning' }">
            <template #header><h2 class="font-bold">{{ t('admin.review.title') }}</h2></template>
            <div class="space-y-3">
              <p v-if="form.seller" class="text-sm text-muted">{{ t('admin.review.by', { name: form.seller.displayName }) }}</p>
              <UTextarea v-model="review.note" :rows="2" maxlength="1000" :placeholder="t('admin.review.notePh')" autoresize class="w-full" />
              <div class="flex gap-2">
                <UButton color="success" icon="i-lucide-check" :loading="review.busy" :label="t('admin.review.approve')" @click="decide('approve')" />
                <UButton color="error" variant="soft" icon="i-lucide-x" :loading="review.busy" :disabled="!review.note.trim()" :label="t('admin.review.reject')" @click="decide('reject')" />
              </div>
            </div>
          </UCard>
          <UCard>
            <div class="space-y-4">
              <UFormField :label="t('admin.product.status')" :help="isSeller && !trusted ? t('seller.reviewHelp') : undefined"><USelect v-model="form.status" :items="statusItems" class="w-full" /></UFormField>
              <USwitch v-if="!isSeller" v-model="form.featured" :label="t('admin.product.featured')" />
            </div>
          </UCard>
          <UCard>
            <template #header><h2 class="font-bold">{{ t('admin.product.pricing') }}</h2></template>
            <div class="space-y-4">
              <USwitch v-model="form.isFree" :label="t('admin.product.isFree')" />
              <template v-if="!form.isFree">
                <UFormField :label="t('admin.product.price')"><UInput v-model.number="form.price" type="number" min="0" dir="ltr" class="w-full" /></UFormField>
                <UFormField :label="t('admin.product.salePrice')"><UInput v-model.number="form.salePrice" type="number" min="0" dir="ltr" class="w-full" /></UFormField>
                <UFormField :label="t('admin.product.saleStarts')"><UInput v-model="form.saleStartsAt" type="datetime-local" dir="ltr" class="w-full" /></UFormField>
                <UFormField :label="t('admin.product.saleEnds')"><UInput v-model="form.saleEndsAt" type="datetime-local" dir="ltr" class="w-full" /></UFormField>
              </template>
            </div>
          </UCard>
          <UCard>
            <template #header><h2 class="font-bold">{{ t('admin.product.media') }}</h2></template>
            <div class="space-y-4">
              <UFormField :label="t('admin.product.cover')"><AdminImageUpload v-model="form.cover" :url="form.coverUrl" /></UFormField>
              <UFormField :label="t('admin.product.screenshots')">
                <div class="grid grid-cols-3 gap-2 mb-2">
                  <div v-for="(u, i) in form.screenshotUrls" :key="u" class="relative">
                    <img :src="u" alt="" class="rounded-md aspect-square object-cover">
                    <UButton icon="i-lucide-x" size="xs" color="error" class="absolute top-1 end-1" @click="removeShot(Number(i))" />
                  </div>
                </div>
                <AdminImageUpload :key="form.screenshots.length" v-model="newShot" />
              </UFormField>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
