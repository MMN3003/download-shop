<script setup lang="ts">
const props = defineProps<{ slug: string }>()
const { t } = useI18n()
const toast = useToast()
const { loggedIn } = useUserSession()
const open = ref(false)
const form = reactive({ reason: 'copyright', details: '', contact: '' })
const reasons = computed(() => ['copyright', 'wrong', 'offensive', 'other'].map(r => ({ label: t(`report.reasons.${r}`), value: r })))
const busy = ref(false)
async function send() {
  busy.value = true
  try {
    await $fetch(`/api/products/${encodeURIComponent(props.slug)}/report`, { method: 'POST', body: form })
    toast.add({ title: t('report.thanks'), color: 'success' })
    open.value = false
    Object.assign(form, { details: '', contact: '' })
  }
  catch (e: any) { toast.add({ title: apiError(e), color: 'error' }) }
  finally { busy.value = false }
}
</script>

<template>
  <UModal v-model:open="open" :title="t('report.title')">
    <UButton block color="neutral" variant="link" size="sm" icon="i-lucide-flag" :label="t('report.button')" />
    <template #body>
      <form id="report-form" class="space-y-4" @submit.prevent="send">
        <UFormField :label="t('report.reason')"><USelect v-model="form.reason" :items="reasons" class="w-full" /></UFormField>
        <UFormField :label="t('report.details')" required :help="t('request.plainNote')"><UTextarea v-model="form.details" :rows="4" maxlength="2000" required minlength="5" autoresize class="w-full" /></UFormField>
        <UFormField v-if="!loggedIn" :label="t('report.contact')" required><UInput v-model="form.contact" dir="ltr" maxlength="120" required class="w-full" /></UFormField>
      </form>
    </template>
    <template #footer>
      <UButton type="submit" form="report-form" icon="i-lucide-send" :loading="busy" :disabled="form.details.trim().length < 5 || (!loggedIn && !form.contact.trim())" :label="t('report.send')" />
    </template>
  </UModal>
</template>
