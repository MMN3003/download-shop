<script setup lang="ts">
/** Uploads one public image and stores its storage key in v-model. */
const key = defineModel<string | null | undefined>()
const props = defineProps<{ url?: string | null }>()
const { t } = useI18n()
const toast = useToast()
const preview = ref<string | null>(props.url ?? (key.value ? `/media/${key.value}` : null))
const busy = ref(false)
const input = ref<HTMLInputElement>()

async function pick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  busy.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch<{ key: string, url: string }>('/api/admin/uploads/image', { method: 'POST', body: fd })
    key.value = res.key
    preview.value = res.url
  }
  catch (err: any) {
    toast.add({ title: t('admin.error'), description: err?.data?.message, color: 'error' })
  }
  finally {
    busy.value = false
    if (input.value) input.value.value = ''
  }
}
</script>

<template>
  <div class="flex items-center gap-3">
    <div class="size-20 rounded-lg border border-default bg-elevated grid place-items-center overflow-hidden shrink-0">
      <img v-if="preview" :src="preview" alt="" class="h-full w-full object-cover">
      <UIcon v-else name="i-lucide-image" class="size-6 text-dimmed" />
    </div>
    <input ref="input" type="file" accept="image/*" class="hidden" @change="pick">
    <UButton :loading="busy" icon="i-lucide-upload" color="neutral" variant="outline" :label="t('admin.upload')" @click="input?.click()" />
    <UButton v-if="key" icon="i-lucide-x" color="neutral" variant="ghost" :label="t('admin.remove')" @click="key = null; preview = null" />
  </div>
</template>
