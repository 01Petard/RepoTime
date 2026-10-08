<script setup lang="ts">
import ProjectStar from '~/components/ProjectStar.vue'
import { archiveStars, activityLevels } from '#shared/stars'
import { categoryColor } from '#shared/archive'
import type { Project } from '#shared/archive'
const props = defineProps<{ projects: Project[]; featured: Project[] }>()
const { archive } = useArchive()
const activity = archiveStars(archive)
const selectedId = ref('')
const skyElement = ref<SVGSVGElement>()
const viewport = ref({ width: 900, height: 360 })
const shimmering = ref(false)
let observer: ResizeObserver | undefined
let visibilityObserver: IntersectionObserver | undefined
let inView = false
function updateShimmer() { shimmering.value = inView && !document.hidden }
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry && entry.contentRect.width > 0) viewport.value = { width: entry.contentRect.width, height: entry.contentRect.height }
  })
  if (skyElement.value) observer.observe(skyElement.value)
  visibilityObserver = new IntersectionObserver(([entry]) => { inView = entry?.isIntersecting ?? false; updateShimmer() })
  if (skyElement.value) visibilityObserver.observe(skyElement.value)
  document.addEventListener('visibilitychange', updateShimmer)
})
onBeforeUnmount(() => { observer?.disconnect(); visibilityObserver?.disconnect(); document.removeEventListener('visibilitychange', updateShimmer) })
// A seeded best-candidate layout stays stable and spreads stars without visible rows.
const nodes = computed(() => {
  const { width, height } = viewport.value
  const inset = Math.min(36, width / 4, height / 4)
  let seed = 2166136261
  for (const project of props.projects) {
    for (const character of project.id) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0
  }
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const positions: { project: Project; x: number; y: number }[] = []
  for (const project of props.projects) {
    let best = { x: width / 2, y: height / 2, distance: -1 }
    for (let attempt = 0; attempt < 32; attempt++) {
      const x = inset + random() * (width - inset * 2)
      const y = inset + random() * (height - inset * 2)
      let distance = Infinity
      for (const node of positions) distance = Math.min(distance, (node.x - x) ** 2 + (node.y - y) ** 2)
      if (distance > best.distance) best = { x, y, distance }
    }
    positions.push({ project, x: best.x, y: best.y })
  }
  return positions
})
const selected = computed(() => props.projects.find(project => project.id === selectedId.value) ?? props.projects[0])
const repositories = new Map(archive.repositories.map(repository => [repository.id, repository]))
const selectedDescription = computed(() => selected.value
  ? repositories.get(selected.value.repositoryIds[0]!)?.description.trim() || '该仓库暂未提供简介。'
  : '')
const stars = computed(() => Array.from({ length: 110 }, (_, index) => ({ x: ((index * .618034 + .11) % 1) * viewport.value.width, y: ((index * .414214 + .07) % 1) * viewport.value.height, r: index % 9 === 0 ? 1.6 : .7, opacity: .2 + (index % 5) * .12 })))
function next() {
  const index = nodes.value.findIndex(node => node.project.id === selected.value?.id)
  selectedId.value = nodes.value[(index + 1) % nodes.value.length]?.project.id ?? ''
}
</script>
<template>
  <div class="project-sky" :class="{ shimmering }">
    <div class="sky-chart" aria-label="公开项目星空">
      <svg ref="skyElement" :viewBox="`0 0 ${viewport.width} ${viewport.height}`" role="group" aria-label="点击项目星，直接打开 GitHub 仓库">
        <defs><radialGradient id="home-nebula"><stop stop-color="#b267ec" stop-opacity=".3" /><stop offset=".5" stop-color="#7355bf" stop-opacity=".18" /><stop offset="1" stop-color="#0a1221" stop-opacity="0" /></radialGradient><radialGradient id="home-dust"><stop stop-color="#ffad86" stop-opacity=".16" /><stop offset="1" stop-color="#0a1221" stop-opacity="0" /></radialGradient></defs>
        <g aria-hidden="true"><ellipse :cx="viewport.width / 2" :cy="viewport.height / 2" :rx="viewport.width * .55" :ry="viewport.height * .3" :transform="`rotate(-15 ${viewport.width / 2} ${viewport.height / 2})`" fill="url(#home-nebula)" /><ellipse :cx="viewport.width * .65" :cy="viewport.height / 2" :rx="viewport.width * .35" :ry="viewport.height * .4" fill="url(#home-dust)" />
          <g v-for="(star, index) in stars" :key="index" :transform="`translate(${star.x},${star.y})`" :opacity="star.opacity"><path v-if="index % 9 === 0" d="M0-4L.8-.8L4 0L.8.8L0 4L-.8.8L-4 0L-.8-.8Z" fill="#bcd5fb" /><circle v-else :r="star.r" fill="#bfd4ef" /></g>
          <g v-for="index in 180" :key="`dust-${index}`" :transform="`translate(${((index * 71) % 997) / 997 * viewport.width},${((index * 151) % 991) / 991 * viewport.height})`"><circle :r="index % 7 === 0 ? 1 : .45" fill="#bed1ff" :opacity=".12 + (index % 4) * .05" /></g>
        </g>
        <a v-for="node in nodes" :key="node.project.id" :href="activity.get(node.project.id)?.url" target="_blank" rel="noopener noreferrer" :data-activity="activity.get(node.project.id)?.tier" :aria-label="`打开 ${node.project.title} 的 GitHub 仓库（新窗口）`" :aria-current="selected?.id === node.project.id ? 'true' : undefined" class="sky-node" :style="{ color: categoryColor(node.project.category) }" @mouseenter="selectedId = node.project.id" @focus="selectedId = node.project.id">
          <title>{{ node.project.title }} · 最近更新 {{ activity.get(node.project.id)?.updatedAt?.slice(0, 10) ?? '暂无记录' }}</title><g :transform="`translate(${node.x},${node.y})`"><circle class="star-hit" r="22" fill="transparent" /><ProjectStar :radius="(activity.get(node.project.id)?.radius ?? 4) * 1.1" :opacity="activity.get(node.project.id)?.opacity" :glow="activity.get(node.project.id)?.glow" /><path v-if="selected?.id === node.project.id" d="M-32-18V-28H-22M22-28H32V-18M32 18V28H22M-22 28H-32V18" fill="none" stroke="currentColor" stroke-opacity=".6" stroke-width="1" /></g>
          <text v-if="selected?.id === node.project.id" :x="node.x" :y="node.y > viewport.height - 65 ? node.y - 24 : node.y + 31" :text-anchor="node.x < 120 ? 'start' : node.x > viewport.width - 120 ? 'end' : 'middle'" fill="#dfebfc" class="sky-project-title">{{ node.project.title }}</text>
        </a>
        <text v-if="!nodes.length" :x="viewport.width / 2" :y="viewport.height / 2" text-anchor="middle" fill="#a0b4ce">暂无公开项目</text>
      </svg>
      <div class="sky-caption"><span><i />{{ nodes.length }} 颗项目星<small class="sky-mobile-hint">· 左右滑动探索</small></span><span class="sky-description" :title="selectedDescription">{{ selectedDescription }}</span><button class="button secondary" :disabled="!nodes.length" @click="next">探索下一颗<AppIcon name="right" :size="14" /></button></div>
    </div>
    <div class="sky-activity-legend"><span>最近更新</span><span v-for="level in activityLevels" :key="level.label"><svg viewBox="-18 -18 36 36" width="22" height="22" aria-hidden="true"><ProjectStar :radius="level.radius" :opacity="level.opacity" :glow="level.glow" /></svg>{{ level.label }}</span></div>
    <div class="sky-exhibits" aria-label="精选项目展览">
      <article v-for="project in featured" :key="project.id" class="sky-exhibit">
        <div class="exhibit-language"><LanguageIcon :language="project.category" />{{ project.category }}</div>
        <h3>{{ project.title }}</h3><p>{{ project.description || '一个等待你探索的公开项目。' }}</p>
        <div class="tech-tags"><span v-for="technology in project.technologies.slice(0, 4)" :key="technology">{{ technology }}</span></div>
        <a :href="activity.get(project.id)?.url" target="_blank" rel="noopener noreferrer" class="button secondary"><AppIcon name="github" />打开 GitHub 仓库<AppIcon name="arrow" /></a>
      </article>
    </div>
  </div>
</template>
<style scoped>
.project-sky { border: 0; border-radius: 16px; overflow: hidden; background: #20162e; box-shadow: 0 14px 36px #08041040; }
.sky-chart { background: radial-gradient(ellipse at 10% 50%, #3c263c80, transparent 65%), #141122; }
.sky-chart > svg { width: 100%; height: 360px; display: block; }
.sky-node { outline: none; }
.sky-node:focus-visible .star-hit { stroke: #fff; stroke-width: 2; }
.sky-activity-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 18px; padding: 10px 18px; border-top: 0; color: #afc3df; font-size: 12px; }
.sky-activity-legend span { display: inline-flex; align-items: center; gap: 5px; }
.sky-project-title { font-size: 12px; font-weight: 550; paint-order: stroke; stroke: #141122; stroke-width: 5px; pointer-events: none; }
.sky-caption { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 18px 12px; color: #afc3df; font-size: 13px; }
.sky-caption > span { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.sky-caption .sky-description { flex: 1; min-width: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; white-space: normal; overflow-wrap: anywhere; text-align: center; line-height: 1.5; }
.sky-caption > button { flex-shrink: 0; }
.sky-mobile-hint { display: none; }
.sky-caption i { width: 5px; height: 5px; border-radius: 50%; background: #94c5ff; }
.sky-exhibits { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; padding: 10px; border-top: 0; }
.sky-exhibit { display: flex; flex-direction: column; min-width: 0; padding: 20px; gap: 10px; border-radius: 12px; background: #382039; }
.sky-exhibit:nth-child(2) { background: #2c2d3b; }
.sky-exhibit:nth-child(3) { background: #342746; }
.sky-exhibit + .sky-exhibit { border-left: 0; }
.exhibit-language { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); }
.sky-exhibit h3 { font-size: 24px; line-height: 1.3; overflow-wrap: anywhere; }
.sky-exhibit p { font-size: 14px; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.sky-exhibit .tech-tags { margin: 0 0 4px; }
.sky-exhibit .button { margin-top: auto; align-self: flex-start; }
.sky-node:nth-of-type(7n) :deep(.project-star-core) { animation: star-shimmer 4.8s ease-in-out infinite; animation-play-state: paused; }
.sky-node:nth-of-type(7n + 2) :deep(.project-star-core) { animation: star-shimmer 6.2s ease-in-out -2s infinite; animation-play-state: paused; }
.shimmering .sky-node :deep(.project-star-core) { animation-play-state: running; }
.sky-node:hover :deep(.project-star-core), .sky-node:focus :deep(.project-star-core) { animation: none; }
@keyframes star-shimmer { 0%, 100% { opacity: 1; } 45% { opacity: .4; } }
@media (prefers-reduced-motion: reduce) { .sky-node :deep(.project-star-core) { animation: none; } }
@media (max-width: 768px) {
  .sky-mobile-hint { display: inline; font-size: 10px; }
  .sky-chart > svg { width: 900px; max-width: none; }
  .sky-chart { overflow-x: auto; scrollbar-width: thin; }
  .sky-caption { position: sticky; left: 0; width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; padding: 0 12px 12px; font-size: 12px; gap: 8px; }
  .sky-caption .sky-description { grid-column: 1 / -1; grid-row: 2; text-align: left; }
  .sky-caption > span { gap: 5px; }
  .sky-caption .button { font-size: 12px; padding-inline: 8px; gap: 4px; }
  .sky-activity-legend { padding: 10px 12px; gap: 6px 12px; font-size: 11px; }
  .sky-exhibits { grid-template-columns: 1fr; }
  .sky-exhibit { padding: 18px; }
  .sky-exhibit + .sky-exhibit { border-left: 0; border-top: 0; }
  .sky-exhibit h3 { font-size: 22px; }
}
</style>
