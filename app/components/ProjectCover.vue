<script setup lang="ts">
import { useId } from 'vue'
import { coverDesign } from '#shared/cover'
import type { Project } from '#shared/archive'
const props = defineProps<{ project: Project }>()
const coverId = useId()
const design = computed(() => coverDesign(props.project.id, props.project.description))
const dust = Array.from({ length: 45 }, (_, index) => ({ x: (index * 83 + 23) % 480, y: (index * 41 + 17) % 160, opacity: .08 + index % 4 * .06 }))
</script>
<template>
  <div v-if="project.cover" class="project-cover"><img :src="project.cover" :alt="`${project.title} 项目封面`" loading="lazy" width="1200" height="400"></div>
  <div v-else class="project-cover auto-cover" :data-cover-icon="design.icon" :class="`cover-variant-${design.variant}`" :style="{ '--cover-ink': design.ink, '--cover-surface': design.surface }" aria-hidden="true">
    <svg class="cover-composition" viewBox="0 0 480 160" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient :id="`${coverId}-panel`" x1="0" y1="0" x2="1" y2="1"><stop stop-color="currentColor" stop-opacity=".13" /><stop offset="1" stop-color="currentColor" stop-opacity=".015" /></linearGradient>
        <linearGradient :id="`${coverId}-edge`"><stop stop-color="currentColor" stop-opacity=".55" /><stop offset="1" stop-color="currentColor" stop-opacity=".07" /></linearGradient>
        <linearGradient :id="`${coverId}-glass`" x1="0" y1="0" x2="0" y2="1"><stop stop-color="currentColor" stop-opacity=".12" /><stop offset="1" stop-color="#061122" stop-opacity=".4" /></linearGradient>
      </defs>
      <circle v-for="(star, index) in dust" :key="index" :cx="star.x" :cy="star.y" :r="index % 9 === 0 ? .8 : .45" fill="currentColor" :opacity="star.opacity" />
      <path d="M31 30Q31 26 36 27L263 49V172L31 142Z" :fill="`url(#${coverId}-panel)`" stroke="currentColor" stroke-opacity=".19" />
      <path d="M43 27Q43 22 48 23L280 46V168L43 135Z" fill="#0a1c33" fill-opacity=".38" stroke="currentColor" stroke-opacity=".17" />
      <path d="M55 24Q55 20 61 21L292 48Q298 49 298 55V173L55 121Z" :fill="`url(#${coverId}-panel)`" :stroke="`url(#${coverId}-edge)`" stroke-width="1.2" />
      <path d="M55 102L298 162V173L55 121Z" fill="currentColor" opacity=".09" />
      <path d="M55 102L298 162" stroke="currentColor" stroke-opacity=".2" />
      <g class="cover-pixels"><rect v-for="(cell, index) in design.cells" :key="index" :x="115 + cell.x * 13" :y="53 + cell.y * 13" width="7" height="7" rx=".6" :opacity="cell.filled ? .26 : .1" /></g>
      <path d="M292 48Q293 44 300 45L427 70L397 184H256Z" fill="#071323" fill-opacity=".5" stroke="currentColor" stroke-opacity=".16" />
      <path d="M317 20Q319 14 327 15L444 32Q451 33 449 41L420 172H274Z" :fill="`url(#${coverId}-glass)`" :stroke="`url(#${coverId}-edge)`" stroke-width="1.5" />
      <path d="M319 18L446 35" stroke="currentColor" stroke-opacity=".22" />
    </svg>
    <div class="cover-symbol">
      <svg v-if="design.icon === 'abstract'" viewBox="0 0 80 80" width="64" height="64"><rect v-for="(cell, index) in design.cells.filter(cell => cell.filled)" :key="index" :x="6 + cell.x * 14" :y="6 + cell.y * 14" width="11" height="11" rx="2" fill="currentColor" /></svg>
      <AppIcon v-else :name="design.icon" :size="64" />
    </div>
  </div>
</template>
