<script setup lang="ts">
defineProps<{ status: string }>()
const { t } = useI18n()
const colors: Record<string, any> = { pending: 'warning', approved: 'success', rejected: 'error', suspended: 'neutral' }
</script>

<template>
  <UBadge :color="colors[status] ?? 'neutral'" variant="soft">{{ t(`seller.status.${status}`) }}</UBadge>
</template>
