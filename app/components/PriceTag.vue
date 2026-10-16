<script setup lang="ts">
const props = defineProps<{ price: number, finalPrice: number, isFree?: boolean, size?: 'sm' | 'lg' }>()
const { money } = useL()
const { t } = useI18n()
const onSale = computed(() => !props.isFree && props.finalPrice < props.price)
const off = computed(() => onSale.value ? Math.round((1 - props.finalPrice / props.price) * 100) : 0)
</script>

<template>
  <div class="flex items-center gap-2 flex-wrap" :class="size === 'lg' ? 'text-2xl' : 'text-base'">
    <span v-if="isFree || finalPrice === 0" class="font-bold text-success">{{ t('product.free') }}</span>
    <template v-else>
      <span class="font-bold">{{ money(finalPrice) }}</span>
      <template v-if="onSale">
        <del class="text-muted text-sm">{{ money(price) }}</del>
        <UBadge color="error" variant="solid" size="sm">{{ off }}٪</UBadge>
      </template>
    </template>
  </div>
</template>
