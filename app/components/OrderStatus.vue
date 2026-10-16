<script setup lang="ts">
defineProps<{ status: string }>()
const { t } = useI18n()
const colors: Record<string, any> = { PENDING_PAYMENT: 'warning', AWAITING_VERIFICATION: 'info', PAID: 'success', REJECTED: 'error', CANCELLED: 'neutral', REFUNDED: 'neutral' }
</script>

<template>
  <UBadge :color="colors[status] ?? 'neutral'" variant="soft">{{ t(`order.status.${status}`) }}</UBadge>
</template>
