<script setup lang="ts">
/**
 * Flippable Anki card preview. Card HTML comes from uploaded decks, so it is
 * rendered inside a sandboxed iframe (no scripts) with the deck's own CSS.
 */
const props = defineProps<{ items: { front: string, back: string, css?: string, noteType?: string }[] }>()
const { t } = useI18n()
const colorMode = useColorMode()
const index = ref(0)
const showBack = ref(false)
const card = computed(() => props.items[index.value])

function go(step: number) {
  index.value = (index.value + step + props.items.length) % props.items.length
  showBack.value = false
}

const srcdoc = computed(() => {
  if (!card.value) return ''
  const dark = colorMode.value === 'dark'
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;height:100%}
    body{display:flex;align-items:center;justify-content:center;font-family:Vazirmatn,Tahoma,sans-serif;font-size:20px;line-height:1.8;text-align:center;padding:16px;box-sizing:border-box;background:${dark ? '#18181b' : '#fff'};color:${dark ? '#f4f4f5' : '#18181b'}}
    .card{background:transparent!important;color:inherit!important}
    hr#answer{border:0;border-top:1px solid currentColor;opacity:.25;margin:12px 0}
    audio{max-width:100%} img{max-width:100%;height:auto}
    ${card.value.css ?? ''}
  </style></head><body><div class="card">${showBack.value ? card.value.back : card.value.front}</div></body></html>`
})
</script>

<template>
  <div v-if="items.length" class="space-y-3">
    <button type="button" class="block w-full rounded-xl border border-default overflow-hidden hover:border-primary transition cursor-pointer" :aria-label="t('product.flip')" @click="showBack = !showBack">
      <iframe :srcdoc="srcdoc" sandbox="" class="w-full h-64 pointer-events-none" title="card preview" />
    </button>
    <div class="flex items-center justify-between gap-2">
      <UButton icon="i-lucide-chevron-right" color="neutral" variant="outline" :aria-label="t('product.prev')" class="rtl:rotate-0 ltr:rotate-180" @click="go(-1)" />
      <div class="text-sm text-muted text-center">
        <p>{{ index + 1 }} / {{ items.length }}</p>
        <p>{{ t('product.previewHint') }}</p>
      </div>
      <UButton icon="i-lucide-chevron-left" color="neutral" variant="outline" :aria-label="t('product.next')" class="rtl:rotate-0 ltr:rotate-180" @click="go(1)" />
    </div>
  </div>
</template>
