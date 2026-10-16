<script setup lang="ts">
defineProps<{ items: any[] }>()
</script>

<template>
  <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <ProductCard v-for="p in items" :key="p.id" :product="p" />
  </div>
</template>
