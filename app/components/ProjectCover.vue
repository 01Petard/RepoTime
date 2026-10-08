<script setup lang="ts">
import { coverDesign } from '#shared/cover'
import type { Project } from '#shared/archive'
const props = defineProps<{ project: Project }>()
const design = computed(() => coverDesign(props.project.id, props.project.description))
</script>
<template>
  <div v-if="project.cover" class="project-cover"><img :src="project.cover" :alt="`${project.title} 项目封面`" loading="lazy" width="1200" height="400"></div>
  <div v-else class="project-cover auto-cover" :data-cover-icon="design.icon" :class="`cover-variant-${design.variant}`" :style="{ '--cover-ink': design.ink, '--cover-surface': design.surface }" aria-hidden="true">
    <svg class="cover-composition" viewBox="0 0 480 160" preserveAspectRatio="xMidYMid slice">
      <path class="cover-plane" d="M270 -50 L490 20 L490 190 L325 190 Z" />
      <path class="cover-contour" d="M250 -25 L470 50 L470 180 M225 -10 L445 65 L445 190" />
      <g class="cover-pixels"><rect v-for="(cell, index) in design.cells" :key="index" :x="342 + cell.x * 15" :y="43 + cell.y * 15" width="8" height="8" rx="1" :opacity="cell.filled ? .25 : .05" /></g>
    </svg>
    <div class="cover-symbol">
      <svg v-if="design.icon === 'abstract'" viewBox="0 0 80 80" width="64" height="64"><rect v-for="(cell, index) in design.cells.filter(cell => cell.filled)" :key="index" :x="6 + cell.x * 14" :y="6 + cell.y * 14" width="11" height="11" rx="2" fill="currentColor" /></svg>
      <AppIcon v-else :name="design.icon" :size="64" />
    </div>
  </div>
</template>
