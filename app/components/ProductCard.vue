<script setup lang="ts">
defineProps<{ product: any }>()
const { l } = useL()
const localePath = useLocalePath()
</script>

<template>
  <NuxtLink :to="localePath(`/p/${product.slug}`)" class="group flex flex-col rounded-xl border border-default bg-elevated/40 overflow-hidden hover:border-primary hover:shadow-lg transition">
    <div class="aspect-[4/3] bg-gradient-to-br from-primary/15 to-primary/5 grid place-items-center overflow-hidden">
      <img v-if="product.cover" :src="product.cover" :alt="l(product.title)" class="h-full w-full object-cover group-hover:scale-105 transition" loading="lazy">
      <div v-else class="text-center p-4">
        <UIcon name="i-lucide-layers" class="size-10 text-primary" />
        <p class="mt-2 font-bold text-sm line-clamp-2">{{ l(product.title) }}</p>
      </div>
    </div>
    <div class="flex flex-col gap-2 p-4 flex-1">
      <div class="flex flex-wrap gap-1">
        <UBadge v-for="b in product.badges" :key="b.key" color="neutral" variant="soft" size="sm"><AttrValue :def="b" :value="b.value" /></UBadge>
      </div>
      <h3 class="font-bold leading-7 line-clamp-2">{{ l(product.title) }}</h3>
      <p v-if="product.shortDesc" class="text-sm text-muted line-clamp-2">{{ l(product.shortDesc) }}</p>
      <div class="mt-auto pt-2 flex items-center justify-between">
        <PriceTag :price="product.price" :final-price="product.finalPrice" :is-free="product.isFree" />
        <span v-if="product.ratingCount" class="text-sm text-muted flex items-center gap-1"><UIcon name="i-lucide-star" class="text-warning" />{{ product.ratingAvg.toFixed(1) }}</span>
      </div>
    </div>
  </NuxtLink>
</template>
