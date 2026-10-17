<script setup lang="ts">
defineProps<{ post: any }>()
const { l, date } = useL()
const localePath = useLocalePath()
</script>

<template>
  <NuxtLink :to="localePath(`/blog/${post.slug}`)" class="group flex flex-col rounded-xl border border-default overflow-hidden hover:border-primary transition">
    <div class="aspect-[16/9] bg-gradient-to-br from-primary/15 to-primary/5 grid place-items-center overflow-hidden">
      <img v-if="post.cover" :src="post.cover" :alt="l(post.title)" class="size-full object-cover group-hover:scale-105 transition" loading="lazy">
      <UIcon v-else name="i-lucide-newspaper" class="size-10 text-primary" />
    </div>
    <div class="p-4 space-y-2">
      <p class="text-xs text-muted">{{ date(post.publishedAt) }}</p>
      <h3 class="font-bold leading-7 line-clamp-2">{{ l(post.title) }}</h3>
      <p v-if="l(post.excerpt)" class="text-sm text-muted line-clamp-3">{{ l(post.excerpt) }}</p>
    </div>
  </NuxtLink>
</template>
