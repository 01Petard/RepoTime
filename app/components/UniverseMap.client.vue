<script setup lang="ts">
import ProjectStar from '~/components/ProjectStar.vue'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { archiveStars, universeActivityLevels } from '#shared/stars'
import { layoutUniverse } from '#shared/layout'
import type { Project } from '../../shared/archive'

const props = withDefaults(defineProps<{ projects: Project[]; mini?: boolean; selectedId?: string; focusFiltered?: boolean }>(), { mini: false, focusFiltered: false })
const { archive } = useArchive()
const activity = new Map([...archiveStars(archive)].map(([id, star]) => [id, { ...star, ...universeActivityLevels[star.tier]! }]))
const svg = ref<SVGSVGElement | null>(null)
const frame = ref<HTMLDivElement | null>(null)
const transform = ref('')
const scale = ref(1)
const expanded = ref(false)
const hoveredId = ref<string | null>(null)
const activeId = computed(() => props.selectedId ?? hoveredId.value)
const layout = computed(() => layoutUniverse(props.mini ? props.projects : archive.projects, props.mini ? 950 : 1400))
const visibleIds = computed(() => new Set(props.projects.map(project => project.id)))
const nodes = computed(() => layout.value.nodes.filter(node => visibleIds.value.has(node.project.id)))
const nodeById = computed(() => new Map(layout.value.nodes.map(node => [node.project.id, node])))
const links = computed(() => {
  const explicit = archive.relations.flatMap(relation => {
    const from = nodeById.value.get(relation.from), to = nodeById.value.get(relation.to)
    return from && to ? [{ from, to, label: relation.label }] : []
  })
  const configured = new Set(explicit.map(link => [link.from.project.id, link.to.project.id].sort().join(':')))
  return [...explicit, ...layout.value.links.filter(link => !configured.has([link.from.project.id, link.to.project.id].sort().join(':')))]
    .filter(link => visibleIds.value.has(link.from.project.id) && visibleIds.value.has(link.to.project.id))
})
const selectedNode = computed(() => layout.value.nodes.find(node => node.project.id === props.selectedId))
const viewWidth = props.mini ? 950 : 1100
const viewHeight = props.mini ? 510 : viewWidth * 9 / 16
let behavior: ZoomBehavior<SVGSVGElement, unknown> | undefined

function applyTransform(x: number, y: number, scale: number) {
  if (!svg.value || !behavior) return
  select(svg.value).call(behavior.transform, zoomIdentity.translate(x, y).scale(scale))
}
function reset() {
  const targets = props.focusFiltered ? nodes.value : layout.value.nodes
  if (!targets.length) { applyTransform(0, 0, 1); return }
  const left = Math.min(...targets.map(node => node.x - node.labelWidth / 2)) - 45
  const right = Math.max(...targets.map(node => node.x + node.labelWidth / 2)) + 45
  const top = Math.min(...targets.map(node => node.y)) - 45
  const bottom = Math.max(...targets.map(node => node.y)) + 65
  const fit = Math.min((viewWidth - 60) / (right - left), (viewHeight - 60) / (bottom - top), 1.2) * (props.mini || props.focusFiltered ? 1 : 1.3)
  applyTransform((viewWidth - (right - left) * fit) / 2 - left * fit, (viewHeight - (bottom - top) * fit) / 2 - top * fit, fit)
}
function zoomBy(factor: number) { if (svg.value && behavior) select(svg.value).call(behavior.scaleBy, factor) }
function fullscreen() { expanded.value = !expanded.value; nextTick(reset) }
function escape(event: KeyboardEvent) { if (event.key === 'Escape') expanded.value = false }
// Nuxt's client component wrapper renders its SVG after the mounted hook.
// Initialize when the actual element arrives so direct page loads work too.
watch(svg, element => {
  if (!element) return
  behavior = zoom<SVGSVGElement, unknown>().scaleExtent([.12, 5]).extent([[0, 0], [viewWidth, viewHeight]])
    .filter(event => !props.mini && event.type === 'mousedown' && !event.ctrlKey && !event.button)
    .touchable(false).clickDistance(5)
    .on('zoom', event => { transform.value = event.transform.toString(); scale.value = event.transform.k })
  select(element).call(behavior).on('wheel.zoom', null).on('dblclick.zoom', null)
  reset()
}, { flush: 'post' })
onMounted(() => { window.addEventListener('keydown', escape) })
onBeforeUnmount(() => { window.removeEventListener('keydown', escape); if (svg.value) select(svg.value).on('.zoom', null) })
watch(() => props.selectedId, () => {
  if (selectedNode.value && !props.mini) applyTransform(viewWidth / 2 - selectedNode.value.x * scale.value, viewHeight / 2 - selectedNode.value.y * scale.value, scale.value)
})
watch(() => props.projects, () => { nextTick(reset) })
defineExpose({ reset })
</script>
<template>
  <div ref="frame" class="universe-map" :class="{ 'mini-map': mini, 'map-expanded': expanded }">
    <div v-if="!mini" class="map-toolbar"><span><i class="live-dot" />{{ projects.length }} 个项目<span class="map-toolbar-hint">拖拽移动 · 按钮缩放</span></span><div class="map-controls"><button aria-label="缩小星图" @click="zoomBy(.75)"><AppIcon name="minus" /></button><button aria-label="放大星图" @click="zoomBy(1.3)"><AppIcon name="plus" /></button><button aria-label="复位星图" @click="reset"><AppIcon name="reset" /></button><button :aria-label="expanded ? '退出全屏' : '全屏探索'" @click="fullscreen"><AppIcon :name="expanded ? 'collapse' : 'expand'" /></button></div></div>
    <svg ref="svg" :viewBox="`0 0 ${viewWidth} ${viewHeight}`" role="group" :aria-label="mini ? '精选项目群星图' : '可缩放的项目星图，Tab 选择项目，Enter 打开 GitHub 仓库'">
      <g :transform="transform">
        <g v-if="!mini" class="map-links" aria-hidden="true"><line v-for="link in links" :key="`${link.from.project.id}-${link.to.project.id}`" class="map-link" :class="{ 'link-active': activeId && [link.from.project.id, link.to.project.id].includes(activeId), 'link-muted': activeId && ![link.from.project.id, link.to.project.id].includes(activeId) }" :x1="link.from.x" :y1="link.from.y" :x2="link.to.x" :y2="link.to.y"><title>{{ link.label }}</title></line></g>
        <a v-for="node in nodes" :key="node.project.id" class="star-node" :class="{ 'star-selected': node.project.id === activeId }" :href="activity.get(node.project.id)?.url" target="_blank" rel="noopener noreferrer" role="link" tabindex="0" :data-activity="activity.get(node.project.id)?.tier" :aria-label="`${node.project.title}，${node.project.date.slice(0, 10)}，${activity.get(node.project.id)?.label}更新，打开 GitHub 仓库（新窗口）`" :data-project="node.project.id" :style="{ color: node.color }" :transform="`translate(${node.x},${node.y})`" @mouseenter="hoveredId = node.project.id" @mouseleave="hoveredId = null" @focus="hoveredId = node.project.id; if (!mini) applyTransform(viewWidth / 2 - node.x * scale, viewHeight / 2 - node.y * scale, scale)" @blur="hoveredId = null">
          <title>{{ node.project.title }} · 创建 {{ node.project.date.slice(0, 10) }} · 最近更新 {{ activity.get(node.project.id)?.updatedAt?.slice(0, 10) ?? '暂无记录' }}</title>
          <circle :r="Math.max(20, activity.get(node.project.id)?.radius ?? 20)" fill="transparent" /><ProjectStar round :radius="activity.get(node.project.id)?.radius" :opacity="activity.get(node.project.id)?.opacity" :glow="activity.get(node.project.id)?.glow" />
          <g :class="['star-label', { 'label-distant': scale < .8 && activity.get(node.project.id)?.tier === 4 && node.project.id !== activeId }]" text-anchor="middle"><text x="0" y="48" fill="#dee9f7">{{ node.project.title }}</text></g>
        </a>
      </g>
    </svg>
    <div v-if="!projects.length" class="map-empty"><AppIcon name="orbit" :size="36" /><p>这片星空里，暂时没有符合筛选条件的项目。</p></div>
    <div v-if="mini" class="mini-map-caption"><span>{{ projects.length }} 颗项目星</span><span>精选项目群星图</span></div>
    <div v-else class="map-legend activity-legend"><span>最近更新</span><span v-for="level in universeActivityLevels" :key="level.label"><svg viewBox="-32 -32 64 64" width="38" height="38" aria-hidden="true"><ProjectStar :radius="level.radius" :opacity="level.opacity" :glow="level.glow" /></svg>{{ level.label }}</span><span>连线表示项目关联 · 点击星星打开 GitHub</span></div>
  </div>
</template>
