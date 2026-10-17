<script setup lang="ts">
const props = defineProps<{ productId: string, block?: boolean }>()
const { t } = useI18n()
const wl = useWishlist()
onMounted(wl.load)
const saved = computed(() => wl.has(props.productId))
</script>

<template>
  <UButton
    :block="block" color="neutral" :variant="block ? 'ghost' : 'soft'" :size="block ? 'md' : 'sm'"
    :icon="saved ? 'i-lucide-heart-off' : 'i-lucide-heart'" :class="saved ? 'text-error' : ''"
    :label="block ? (saved ? t('wishlist.remove') : t('wishlist.add')) : undefined"
    :aria-label="saved ? t('wishlist.remove') : t('wishlist.add')" :aria-pressed="saved"
    @click.prevent.stop="wl.toggle(productId)"
  />
</template>
