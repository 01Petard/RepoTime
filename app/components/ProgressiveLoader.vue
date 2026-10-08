<script setup lang="ts">
defineProps<{ shown: number; total: number; hasMore: boolean }>()
defineEmits<{ more: [] }>()
</script>
<template>
  <div class="progressive-loader" role="status" aria-live="polite">
    <span>已显示 {{ shown }} / {{ total }}</span>
    <button v-if="hasMore" class="button secondary" @click="$emit('more')">加载更多<AppIcon name="plus" :size="16" /></button>
    <span v-else>已展示全部记录</span>
  </div>
</template>
