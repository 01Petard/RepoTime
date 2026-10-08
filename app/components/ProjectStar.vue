<script setup lang="ts">
withDefaults(defineProps<{ radius?: number; opacity?: number; glow?: number }>(), { radius: 12, opacity: 1, glow: .35 })
</script>
<template>
  <g class="project-star" :opacity="opacity" :style="{ '--star-glow': glow }" :transform="`scale(${radius / 12})`" aria-hidden="true">
    <path class="star-aura" d="M0-16C2-4 4-2 16 0C4 2 2 4 0 16C-2 4-4 2-16 0C-4-2-2-4 0-16Z" fill="currentColor" />
    <path d="M0-12C1.6-3.5 3.5-1.6 12 0C3.5 1.6 1.6 3.5 0 12C-1.6 3.5-3.5 1.6-12 0C-3.5-1.6-1.6-3.5 0-12Z" fill="currentColor" />
    <path d="M-7-7L-1-2L0-7L1-2L7-7L2-1L7 0L2 1L7 7L1 2L0 7L-1 2L-7 7L-2 1L-7 0L-2-1Z" fill="currentColor" opacity=".3" />
    <path class="project-star-core" d="M0-7C.8-1.7 1.7-.8 7 0C1.7.8.8 1.7 0 7C-.8 1.7-1.7.8-7 0C-1.7-.8-.8-1.7 0-7Z" fill="#f1f7ff" />
  </g>
</template>
<style scoped>
.star-aura { filter: blur(4px); opacity: var(--star-glow); }
</style>
