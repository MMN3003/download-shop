<script setup lang="ts">
const route = useRoute()
const { data: post, error } = await useFetch<any>(() => `/api/blog/${encodeURIComponent(String(route.params.slug))}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 500, statusMessage: error.value.statusMessage, fatal: true })
const { t } = useI18n()
const { l, date } = useL()
const localePath = useLocalePath()

useSeoMeta({
  title: () => l(post.value?.seoTitle) || l(post.value?.title),
  description: () => l(post.value?.seoDesc) || l(post.value?.excerpt),
  ogImage: () => post.value?.cover,
  ogType: 'article',
})
useHead({
  script: [{
    type: 'application/ld+json',
    // Escape "<" so text from the post can't close the script tag
    innerHTML: computed(() => JSON.stringify({
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      'headline': l(post.value?.title), 'image': post.value?.cover || undefined,
      'datePublished': post.value?.publishedAt, 'dateModified': post.value?.updatedAt,
      'author': { '@type': 'Person', 'name': post.value?.author },
    }).replace(/</g, '\\u003c')),
  }],
})
</script>

<template>
  <UContainer v-if="post" class="py-8">
    <article class="max-w-3xl mx-auto space-y-6">
      <UBreadcrumb :items="[{ label: t('blog.title'), to: localePath('/blog') }, { label: l(post.title) }]" />
      <header class="space-y-3">
        <h1 class="text-2xl md:text-4xl font-extrabold leading-snug">{{ l(post.title) }}</h1>
        <p class="text-sm text-muted">{{ date(post.publishedAt) }} · <bdi>{{ post.author }}</bdi></p>
        <div v-if="post.tags.length" class="flex gap-2 flex-wrap">
          <NuxtLink v-for="tag in post.tags" :key="tag" :to="localePath({ path: '/blog', query: { tag } })"><UBadge color="neutral" variant="soft" class="hover:text-primary"><bdi>{{ tag }}</bdi></UBadge></NuxtLink>
        </div>
      </header>
      <img v-if="post.cover" :src="post.cover" :alt="l(post.title)" class="w-full rounded-2xl">
      <!-- Sanitised on save (server/utils/blog.ts) -->
      <div class="prose dark:prose-invert max-w-none leading-8" v-html="l(post.body)" />
    </article>

    <section v-if="post.products.length" class="mt-14">
      <h2 class="text-xl font-extrabold mb-4">{{ t('blog.products') }}</h2>
      <ProductGrid :items="post.products" />
    </section>
    <section v-if="post.more.length" class="mt-14">
      <h2 class="text-xl font-extrabold mb-4">{{ t('blog.more') }}</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BlogCard v-for="p in post.more" :key="p.id" :post="p" />
      </div>
    </section>
  </UContainer>
</template>
