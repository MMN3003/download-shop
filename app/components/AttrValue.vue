<script setup lang="ts">
/** A field value as text, with the flag/icon of each chosen option. */
const props = defineProps<{ def: { kind: string, options?: any, unit?: any }, value: unknown }>()
const fmt = useAttrFormat()
const { l } = useL()
const chosen = computed(() => {
  if (props.def.kind !== 'SELECT' && props.def.kind !== 'MULTISELECT') return null
  const opts = (props.def.options ?? []) as { value: string, label: Record<string, string>, icon?: string, image?: string }[]
  const values = Array.isArray(props.value) ? props.value as string[] : [String(props.value)]
  return values.map(v => opts.find(o => o.value === v) ?? { value: v, label: { fa: v, en: v } })
})
</script>

<template>
  <span v-if="chosen" class="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
    <span v-for="o in chosen" :key="o.value" class="inline-flex items-center gap-1"><OptionMark :option="o" />{{ l(o.label) }}</span>
  </span>
  <span v-else>{{ fmt(def, value) }}</span>
</template>
