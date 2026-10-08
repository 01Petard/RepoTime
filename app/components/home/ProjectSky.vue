<script setup lang="ts">
import ProjectStar from '~/components/ProjectStar.vue'
import { archiveStars, activityLevels } from '#shared/stars'
import { categoryColor } from '#shared/archive'
import type { Project } from '#shared/archive'
const props = defineProps<{ projects: Project[] }>()
const { archive } = useArchive()
const activity = archiveStars(archive)
const selectedId = ref('')
const nodes = computed(() => props.projects.slice(0, 9).map((project, index, all) => {
  const columns = Math.min(3, all.length)
  const rows = Math.ceil(all.length / columns)
  return { project, x: 135 + (index % columns) * (610 / Math.max(1, columns - 1)) + (Math.floor(index / columns) % 2 ? 35 : 0), y: 125 + Math.floor(index / columns) * (205 / Math.max(1, rows - 1)) + [20, -25, 5][index % 3]! }
}))
const selected = computed(() => props.projects.find(project => project.id === selectedId.value) ?? props.projects[0])
const stars = Array.from({ length: 110 }, (_, index) => ({ x: (index * 137 + 29) % 900, y: (index * 89 + 41) % 460, r: index % 9 === 0 ? 1.6 : .7, opacity: .2 + (index % 5) * .12 }))
function next() {
  const index = nodes.value.findIndex(node => node.project.id === selected.value?.id)
  selectedId.value = nodes.value[(index + 1) % nodes.value.length]?.project.id ?? ''
}
</script>
<template>
  <div class="project-sky">
    <div class="sky-chart" aria-label="精选项目星空">
      <svg viewBox="0 0 900 460" role="group" aria-label="点击项目星，直接打开 GitHub 仓库">
        <defs><radialGradient id="home-nebula"><stop stop-color="#4c6da1" stop-opacity=".23" /><stop offset=".5" stop-color="#334b80" stop-opacity=".12" /><stop offset="1" stop-color="#0a1221" stop-opacity="0" /></radialGradient><radialGradient id="home-dust"><stop stop-color="#8b689e" stop-opacity=".11" /><stop offset="1" stop-color="#0a1221" stop-opacity="0" /></radialGradient></defs>
        <g aria-hidden="true"><ellipse cx="450" cy="220" rx="460" ry="110" transform="rotate(-24 450 220)" fill="url(#home-nebula)" /><ellipse cx="600" cy="180" rx="310" ry="140" fill="url(#home-dust)" />
          <g v-for="(star, index) in stars" :key="index" :transform="`translate(${star.x},${star.y})`" :opacity="star.opacity"><path v-if="index % 9 === 0" d="M0-4L.8-.8L4 0L.8.8L0 4L-.8.8L-4 0L-.8-.8Z" fill="#bcd5fb" /><circle v-else :r="star.r" fill="#bfd4ef" /></g>
          <g v-for="index in 180" :key="`dust-${index}`" :transform="`translate(${(index * 71) % 900},${330 - ((index * 71) % 900) * .25 + Math.sin(index * 4.7) * (25 + index % 50)})`"><circle :r="index % 7 === 0 ? 1 : .45" fill="#bed1ff" :opacity=".12 + (index % 4) * .05" /></g>
        </g>
        <a v-for="node in nodes" :key="node.project.id" :href="activity.get(node.project.id)?.url" target="_blank" rel="noopener noreferrer" :data-activity="activity.get(node.project.id)?.tier" :aria-label="`打开 ${node.project.title} 的 GitHub 仓库（新窗口）`" :aria-current="selected?.id === node.project.id ? 'true' : undefined" class="sky-node" :style="{ color: categoryColor(node.project.category) }" @mouseenter="selectedId = node.project.id" @focus="selectedId = node.project.id">
          <title>{{ node.project.title }} · 最近更新 {{ activity.get(node.project.id)?.updatedAt?.slice(0, 10) ?? '暂无记录' }}</title><g :transform="`translate(${node.x},${node.y})`"><circle class="star-hit" r="32" fill="transparent" /><ProjectStar :radius="(activity.get(node.project.id)?.radius ?? 4) * 1.8" :opacity="activity.get(node.project.id)?.opacity" :glow="activity.get(node.project.id)?.glow" /><path v-if="selected?.id === node.project.id" d="M-32-18V-28H-22M22-28H32V-18M32 18V28H22M-22 28H-32V18" fill="none" stroke="currentColor" stroke-opacity=".6" stroke-width="1" /></g>
          <text :x="node.x" :y="node.y + 50" text-anchor="middle" fill="#dfebfc" class="sky-project-title">{{ node.project.title }}</text><text :x="node.x" :y="node.y + 71" text-anchor="middle" fill="#a0b4ce" class="sky-project-date">{{ node.project.date.slice(0, 10) }}</text>
        </a>
        <text v-if="!nodes.length" x="450" y="230" text-anchor="middle" fill="#a0b4ce">暂无精选项目</text>
      </svg>
      <div class="sky-caption"><span><i />{{ nodes.length }} 颗精选项目星<small class="sky-mobile-hint">· 左右滑动探索</small></span><button :disabled="!nodes.length" @click="next">探索下一颗<AppIcon name="right" :size="14" /></button></div>
    </div>
    <div class="sky-activity-legend"><span>最近更新</span><span v-for="level in activityLevels" :key="level.label"><svg viewBox="-18 -18 36 36" width="22" height="22" aria-hidden="true"><ProjectStar :radius="level.radius" :opacity="level.opacity" :glow="level.glow" /></svg>{{ level.label }}</span></div>
    <div v-if="selected" class="sky-selection"><div><span :style="{ color: categoryColor(selected.category) }">{{ selected.category }} · 最近更新 {{ activity.get(selected.id)?.updatedAt?.slice(0, 10) ?? '暂无记录' }}</span><h3>{{ selected.title }}</h3><p>{{ selected.description || '一个等待你探索的公开项目。' }}</p></div><a :href="activity.get(selected.id)?.url" target="_blank" rel="noopener noreferrer" class="button secondary">打开 GitHub 仓库<AppIcon name="arrow" /></a></div>
  </div>
</template>
<style scoped>
.project-sky { border: 1px solid #2c3b52; border-radius: 16px; overflow: hidden; background: #0a1221; }
.sky-chart { background: radial-gradient(ellipse at 50% 45%, #233e692e, transparent 70%); }
.sky-chart > svg { width: 100%; display: block; }
.sky-node { outline: none; }
.sky-node circle, .sky-node text { transition: opacity .18s; }
.sky-node:hover .project-star, .sky-node:focus-visible .project-star { outline: none; }
.sky-node:focus-visible .star-hit { stroke: #fff; stroke-width: 2; }
.sky-activity-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 18px; padding: 12px 28px; border-top: 1px solid #2c3b52; color: #a0b4ce; font-size: 10px; }
.sky-activity-legend span { display: inline-flex; align-items: center; gap: 5px; }
.sky-project-title { font-size: 15px; font-weight: 500; }
.sky-project-date { font-size: 11px; font-family: var(--font-mono); }
.sky-caption { display: flex; align-items: center; justify-content: space-between; padding: 0 28px 22px; color: #a0b4ce; font-size: 11px; }
.sky-caption span, .sky-caption button { display: flex; align-items: center; gap: 9px; }
.sky-mobile-hint { display: none; }
.sky-caption i { width: 5px; height: 5px; border-radius: 50%; background: #94c5ff; }
.sky-caption button { background: none; border: none; color: #c7dcf6; font: inherit; min-height: 36px; white-space: nowrap; }
.sky-selection { display: flex; gap: 30px; justify-content: space-between; align-items: center; padding: 27px 32px; border-top: 1px solid #2c3b52; background: #101b2b; }
.sky-selection > div { min-width: 0; }
.sky-selection span { font: 11px var(--font-mono); }
.sky-selection h3 { font-size: 25px; margin: 8px 0; overflow-wrap: anywhere; }
.sky-selection p { max-width: 65ch; font-size: 13px; color: #a9bad0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
@media (max-width: 768px) { .sky-mobile-hint { display: inline; font-size: 9px; } .sky-caption { gap: 12px; } .sky-caption span { gap: 5px; white-space: nowrap; } .sky-chart > svg { width: 740px; max-width: none; } .sky-chart { overflow-x: auto; scrollbar-width: thin; } .sky-caption { width: 100%; min-width: 300px; position: sticky; left: 0; padding: 0 18px 16px; } .sky-selection { align-items: flex-start; flex-direction: column; padding: 22px; gap: 18px; } .sky-selection h3 { font-size: 22px; } }
@media (prefers-reduced-motion: reduce) { .sky-node circle, .sky-node text { transition: none; } }
</style>
