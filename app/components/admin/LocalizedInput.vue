<script setup lang="ts">
/** Edits multi-language text ({ fa, en }) with one input per store language. */
const props = defineProps<{ textarea?: boolean, rows?: number, placeholder?: string, disabled?: boolean }>()
const model = defineModel<Record<string, string> | null | undefined>()
const { locales } = useI18n()

function update(code: string, value: string) {
  model.value = { ...(model.value ?? {}), [code]: value }
}
</script>

<template>
  <div class="grid gap-2" :class="textarea ? '' : 'sm:grid-cols-2'">
    <div v-for="loc in locales" :key="loc.code" class="relative">
      <UTextarea v-if="props.textarea" :model-value="model?.[loc.code] ?? ''" :rows="rows ?? 3" :disabled="disabled" :dir="loc.dir" :placeholder="loc.name" autoresize class="w-full" @update:model-value="v => update(loc.code, String(v))" />
      <UInput v-else :disabled="disabled" :model-value="model?.[loc.code] ?? ''" :dir="loc.dir" :placeholder="placeholder ? `${placeholder} (${loc.name})` : loc.name" class="w-full" @update:model-value="v => update(loc.code, String(v))" />
    </div>
  </div>
</template>
