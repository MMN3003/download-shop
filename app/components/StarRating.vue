<script setup lang="ts">
/** Five stars, read-only or as a picker (v-model). */
const props = defineProps<{ value?: number, size?: string, pick?: boolean }>()
const model = defineModel<number>()
const { t } = useI18n()
const STAR = 'M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96z'
const shown = computed(() => props.pick ? (model.value ?? 0) : (props.value ?? 0))
</script>

<template>
  <span class="inline-flex items-center gap-0.5" dir="ltr" :role="pick ? 'radiogroup' : 'img'" :aria-label="pick ? t('review.rating') : t('review.stars', { n: shown.toFixed(1) })">
    <template v-for="i in 5" :key="i">
      <button v-if="pick" type="button" role="radio" :aria-checked="model === i" :aria-label="t('review.stars', { n: i })" class="p-0.5" @click="model = i">
        <svg viewBox="0 0 24 24" :class="[size?.startsWith('size-') ? size : 'size-6', i <= shown ? 'text-warning' : 'text-dimmed']" aria-hidden="true"><path :d="STAR" :fill="i <= shown ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></svg>
      </button>
      <!-- Inline SVG: icon-font stars are masks and can't be filled -->
      <svg v-else viewBox="0 0 24 24" :class="[size?.startsWith('size-') ? size : 'size-4', i <= Math.round(shown) ? 'text-warning' : 'text-dimmed']" aria-hidden="true"><path :d="STAR" :fill="i <= Math.round(shown) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></svg>
    </template>
  </span>
</template>
