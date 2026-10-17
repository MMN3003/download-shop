<script setup lang="ts">
/**
 * Conversation between a buyer and staff. Every text is rendered with {{ }}
 * (escaped by Vue), never v-html, so nothing a user types can run as code.
 */
const props = defineProps<{ messages: { id: string, body: string, fromStaff: boolean, createdAt: string, author?: { name: string | null } | null }[], viewer: 'user' | 'staff' }>()
const { t, locale } = useI18n()
const when = (d: string) => new Intl.DateTimeFormat(locale.value === 'fa' ? 'fa-IR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d))
const mine = (m: { fromStaff: boolean }) => (props.viewer === 'staff') === m.fromStaff
</script>

<template>
  <ul class="space-y-3">
    <li v-for="m in messages" :key="m.id" class="flex" :class="mine(m) ? 'justify-start' : 'justify-end'">
      <div class="max-w-[85%] rounded-2xl px-4 py-3" :class="mine(m) ? 'bg-primary/10' : 'bg-elevated border border-default'">
        <p class="text-xs text-muted mb-1">
          {{ m.fromStaff ? (viewer === 'staff' && m.author?.name ? m.author.name : t('request.support')) : (viewer === 'user' ? t('request.you') : t('admin.request.buyer')) }} · {{ when(m.createdAt) }}
        </p>
        <p class="whitespace-pre-line break-words leading-7" dir="auto">{{ m.body }}</p>
      </div>
    </li>
  </ul>
</template>
