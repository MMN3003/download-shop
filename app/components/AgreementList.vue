<script setup lang="ts">
/** Commission agreements with their scope and state; actions are passed in by the page. */
defineProps<{ items: any[], viewer: 'seller' | 'store' }>()
defineEmits<{ act: [id: string, action: string] }>()
const { t } = useI18n()
const { l, date, num } = useL()
const colors: Record<string, any> = { PROPOSED: 'warning', ACCEPTED: 'success', REJECTED: 'error', WITHDRAWN: 'neutral' }
const inForce = (a: any) => a.status === 'ACCEPTED' && new Date(a.startsAt) <= new Date() && (!a.endsAt || new Date(a.endsAt) > new Date())
</script>

<template>
  <ul class="divide-y divide-default">
    <li v-for="a in items" :key="a.id" class="py-3 flex flex-wrap items-start gap-3">
      <span class="text-xl font-extrabold w-16 shrink-0">{{ num(a.percent) }}٪</span>
      <div class="flex-1 min-w-48 space-y-1 text-sm">
        <p class="font-medium">
          {{ a.product ? l(a.product.title) : a.section ? l(a.section.name) : t('seller.scope.seller') }}
          <span class="text-muted">· {{ t(`seller.by.${a.proposedBy}`) }} · {{ date(a.createdAt) }}</span>
        </p>
        <p v-if="a.status === 'ACCEPTED'" class="text-xs text-muted">{{ t('seller.from') }} {{ date(a.startsAt) }}<span v-if="a.endsAt"> {{ t('seller.until') }} {{ date(a.endsAt) }}</span></p>
        <p v-if="a.note" class="whitespace-pre-line break-words text-muted" dir="auto">{{ a.note }}</p>
        <p v-if="a.answer" class="whitespace-pre-line break-words" dir="auto"><UIcon name="i-lucide-reply" class="align-middle" /> {{ a.answer }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UBadge v-if="inForce(a)" color="success" variant="solid">{{ t('seller.inForce') }}</UBadge>
        <UBadge v-else :color="colors[a.status]" variant="soft">{{ t(`seller.agreement.${a.status}`) }}</UBadge>
        <template v-if="a.status === 'PROPOSED'">
          <template v-if="(viewer === 'seller') === (a.proposedBy === 'store')">
            <UButton size="xs" color="success" icon="i-lucide-check" :label="t('seller.accept')" @click="$emit('act', a.id, 'accept')" />
            <UButton size="xs" color="error" variant="soft" icon="i-lucide-x" :label="t('seller.reject')" @click="$emit('act', a.id, 'reject')" />
            <UButton v-if="viewer === 'store'" size="xs" color="neutral" variant="soft" icon="i-lucide-repeat" :label="t('admin.seller.counter')" @click="$emit('act', a.id, 'counter')" />
          </template>
          <UButton v-else size="xs" color="neutral" variant="ghost" icon="i-lucide-undo-2" :label="t('seller.withdraw')" @click="$emit('act', a.id, viewer === 'seller' ? 'withdraw' : 'reject')" />
        </template>
        <UButton v-if="viewer === 'store' && inForce(a)" size="xs" color="neutral" variant="ghost" icon="i-lucide-calendar-x" :label="t('admin.seller.end')" @click="$emit('act', a.id, 'end')" />
      </div>
    </li>
  </ul>
</template>
