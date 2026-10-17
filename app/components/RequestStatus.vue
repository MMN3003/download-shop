<script setup lang="ts">
defineProps<{ status: string }>()
const { t } = useI18n()
const colors: Record<string, any> = { OPEN: 'info', IN_PROGRESS: 'warning', DONE: 'success', DECLINED: 'neutral' }
</script>

<template>
  <UBadge :color="colors[status] ?? 'neutral'" variant="soft">{{ t(`request.status.${status}`) }}</UBadge>
</template>
