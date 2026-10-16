<script setup lang="ts">
/**
 * Renders plugin previews by kind. Add a component here when a new plugin
 * produces a new preview kind (e.g. "pdf-page", "audio-clip").
 */
import AnkiCards from './previews/AnkiCards.vue'

const props = defineProps<{ previews: { kind: string, data: any }[] }>()
const groups = computed(() => {
  const by: Record<string, any[]> = {}
  for (const p of props.previews) (by[p.kind] ??= []).push(p.data)
  return by
})
const components: Record<string, any> = { 'anki-card': AnkiCards }
</script>

<template>
  <div class="space-y-6">
    <template v-for="(items, kind) in groups" :key="kind">
      <component :is="components[kind]" v-if="components[kind]" :items="items" />
    </template>
  </div>
</template>
