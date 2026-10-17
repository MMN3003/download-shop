<script setup lang="ts">
/** "Arabic → Persian" with flags; values come from the shared list. */
const props = defineProps<{ source: string, target: string, options: { value: string, label: Record<string, string>, icon?: string, image?: string }[] }>()
const { l } = useL()
const s = computed(() => props.options.find(o => o.value === props.source))
const d = computed(() => props.options.find(o => o.value === props.target))
</script>

<template>
  <span class="inline-flex items-center gap-1.5 flex-wrap">
    <span class="inline-flex items-center gap-1"><OptionMark :option="s" />{{ s ? l(s.label) : source }}</span>
    <UIcon name="i-lucide-arrow-left" class="size-4 text-muted ltr:rotate-180" />
    <span class="inline-flex items-center gap-1"><OptionMark :option="d" />{{ d ? l(d.label) : target }}</span>
  </span>
</template>
