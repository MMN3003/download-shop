<script setup lang="ts">
/** The flag/icon or image of a list choice, if it has one. */
defineProps<{ option?: { icon?: string | null, image?: string | null } | null, size?: string }>()
</script>

<template>
  <img v-if="option?.image" :src="option.image" alt="" class="inline-block rounded-full object-cover shrink-0" :class="size ?? 'size-4'">
  <UIcon v-else-if="option?.icon" :name="option.icon" class="shrink-0" :class="size ?? 'size-4'" />
</template>
