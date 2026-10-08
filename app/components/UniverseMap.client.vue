<script setup lang="ts">
import ProjectStar from '~/components/ProjectStar.vue'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { archiveStars, activityLevels } from '#shared/stars'
import { layoutUniverse } from '#shared/layout'
import type { Project } from '../../shared/archive'

const props = withDefaults(defineProps<{ projects: Project[]; mini?: boolean; selectedId?: string; focusFiltered?: boolean }>(), { mini: false, focusFiltered: false })
const { archive } = useArchive()
const activity = archiveStars(archive)
const svg = ref<SVGSVGElement | null>(null)
const frame = ref<HTMLDivElement | null>(null)
const transform = ref('')
const expanded = ref(false)
const hoveredId = ref<string | null>(null)
const activeId = computed(() => props.selectedId ?? hoveredId.value)
const layout = computed(() => layoutUniverse(props.mini ? props.projects : archive.projects, props.mini ? 950 : 1400))
const visibleIds = computed(() => new Set(props.projects.map(project => project.id)))
const nodes = computed(() => layout.value.nodes.filter(node => visibleIds.value.has(node.project.id)))
const selectedNode = computed(() => layout.value.nodes.find(node => node.project.id === props.selectedId))
const viewWidth = props.mini ? 950 : 1100
const viewHeight = props.mini ? 510 : 680
let behavior: ZoomBehavior<SVGSVGElement, unknown> | undefined

function applyTransform(x: number, y: number, scale: number) {
  if (!svg.value || !behavior) return
  select(svg.value).call(behavior.transform, zoomIdentity.translate(x, y).scale(scale))
}
function reset() {
  const horizontalScale = (viewWidth - 70) / layout.value.width
  if (props.mini) {
    const scale = Math.min(horizontalScale, (viewHeight - 80) / layout.value.height)
    applyTransform((viewWidth - layout.value.width * scale) / 2, 35, scale)
  } else if (props.focusFiltered && nodes.value.length) {
    const left = Math.min(...nodes.value.map(node => node.x)) - 60
    const right = Math.max(...nodes.value.map(node => node.x)) + 240
    const top = Math.min(...nodes.value.map(node => node.y)) - 60
    const bottom = Math.max(...nodes.value.map(node => node.y)) + 60
    const scale = Math.min((viewWidth - 70) / (right - left), (viewHeight - 80) / (bottom - top), 1.5)
    applyTransform((viewWidth - (right - left) * scale) / 2 - left * scale, 40 - top * scale, scale)
  } else {
    // Fit the date axis without shrinking many category lanes into unreadable dots.
    applyTransform(35, 35, horizontalScale)
  }
}
function zoomBy(factor: number) { if (svg.value && behavior) select(svg.value).call(behavior.scaleBy, factor) }
function fullscreen() { expanded.value = !expanded.value; nextTick(reset) }
function escape(event: KeyboardEvent) { if (event.key === 'Escape') expanded.value = false }
// Nuxt's client component wrapper renders its SVG after the mounted hook.
// Initialize when the actual element arrives so direct page loads work too.
watch(svg, element => {
  if (!element) return
  behavior = zoom<SVGSVGElement, unknown>().scaleExtent([.12, 5]).extent([[0, 0], [viewWidth, viewHeight]])
    .filter(event => !props.mini && ((!event.ctrlKey || event.type === 'wheel') && !event.button))
    .on('zoom', event => { transform.value = event.transform.toString() })
  select(element).call(behavior).on('dblclick.zoom', null)
  reset()
}, { flush: 'post' })
onMounted(() => { window.addEventListener('keydown', escape) })
onBeforeUnmount(() => { window.removeEventListener('keydown', escape); if (svg.value) select(svg.value).on('.zoom', null) })
watch(() => props.selectedId, () => {
  if (selectedNode.value && !props.mini) applyTransform(viewWidth * .56 - selectedNode.value.x, viewHeight * .46 - selectedNode.value.y, 1)
})
watch(() => props.projects, () => { nextTick(reset) })
defineExpose({ reset })
</script>
<template>
  <div ref="frame" class="universe-map" :class="{ 'mini-map': mini, 'map-expanded': expanded }">
    <div v-if="!mini" class="map-toolbar"><span><i class="live-dot" />{{ projects.length }} 个项目<span class="map-toolbar-hint">拖拽探索 · 滚轮缩放</span></span><div class="map-controls"><button aria-label="缩小星图" @click="zoomBy(.75)"><AppIcon name="minus" /></button><button aria-label="放大星图" @click="zoomBy(1.3)"><AppIcon name="plus" /></button><button aria-label="复位星图" @click="reset"><AppIcon name="reset" /></button><button :aria-label="expanded ? '退出全屏' : '全屏探索'" @click="fullscreen"><AppIcon :name="expanded ? 'collapse' : 'expand'" /></button></div></div>
    <svg ref="svg" :viewBox="`0 0 ${viewWidth} ${viewHeight}`" role="group" :aria-label="mini ? '精选项目时间星图' : '可缩放的项目星图，Tab 选择项目，Enter 打开 GitHub 仓库'">
      <g :transform="transform">
        <g v-for="tick in layout.ticks" :key="tick.year" class="map-year"><line :x1="tick.x" :x2="tick.x" y1="30" :y2="layout.height" /><text :x="tick.x" y="12">{{ tick.year }}</text></g>
        <g v-for="band in layout.bands" :key="band.category" class="map-band"><line x1="55" :x2="layout.width - 30" :y1="band.y" :y2="band.y" /><text x="55" :y="band.y + 20" :fill="band.color">{{ band.category }}</text></g>
        <template v-if="activeId && !mini"><template v-for="relation in archive.relations" :key="`${relation.from}-${relation.to}`"><line v-if="[relation.from, relation.to].includes(activeId) && visibleIds.has(relation.from) && visibleIds.has(relation.to)" :x1="layout.nodes.find(node => node.project.id === relation.from)?.x" :y1="layout.nodes.find(node => node.project.id === relation.from)?.y" :x2="layout.nodes.find(node => node.project.id === relation.to)?.x" :y2="layout.nodes.find(node => node.project.id === relation.to)?.y" stroke="#8eaee5" stroke-opacity=".6" stroke-width="1"><title>{{ relation.label }}</title></line></template></template>
        <a v-for="node in nodes" :key="node.project.id" class="star-node" :class="{ 'star-selected': node.project.id === activeId }" :href="activity.get(node.project.id)?.url" target="_blank" rel="noopener noreferrer" role="link" tabindex="0" :data-activity="activity.get(node.project.id)?.tier" :aria-label="`${node.project.title}，${node.project.date.slice(0, 10)}，${activity.get(node.project.id)?.label}更新，打开 GitHub 仓库（新窗口）`" :data-project="node.project.id" :style="{ color: node.color }" :transform="`translate(${node.x},${node.y})`" @mouseenter="hoveredId = node.project.id" @mouseleave="hoveredId = null" @focus="hoveredId = node.project.id; if (!mini) applyTransform(viewWidth * .56 - node.x, viewHeight * .46 - node.y, 1)" @blur="hoveredId = null">
          <title>{{ node.project.title }} · 创建 {{ node.project.date.slice(0, 10) }} · 最近更新 {{ activity.get(node.project.id)?.updatedAt?.slice(0, 10) ?? '暂无记录' }}</title>
          <circle r="20" fill="transparent" /><ProjectStar :radius="activity.get(node.project.id)?.radius" :opacity="activity.get(node.project.id)?.opacity" :glow="activity.get(node.project.id)?.glow" />
          <g class="star-label" :text-anchor="node.labelAnchor"><text :x="node.labelX" y="-3" fill="#dee9f7">{{ node.project.title }}</text><text :x="node.labelX" y="14" class="star-date">{{ node.project.date.slice(0, 10) }}</text></g>
        </a>
      </g>
    </svg>
    <div v-if="!projects.length" class="map-empty"><AppIcon name="orbit" :size="36" /><p>这个时间坐标里，暂时没有项目。</p></div>
    <div v-if="mini" class="mini-map-caption"><span>{{ layout.minYear }} — {{ layout.maxYear }}</span><span>项目创建时间 / 精选档案</span></div>
    <div v-else class="map-legend activity-legend"><span>最近更新</span><span v-for="level in activityLevels" :key="level.label"><svg viewBox="-18 -18 36 36" width="25" height="25" aria-hidden="true"><ProjectStar :radius="level.radius" :opacity="level.opacity" :glow="level.glow" /></svg>{{ level.label }}</span><span>点击星星打开 GitHub</span></div>
  </div>
</template>
