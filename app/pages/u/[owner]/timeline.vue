<script setup lang="ts">
import { timelineEvents } from '#shared/archive'
const { archive, universePath, projectPath, dateLabel, categoryColor } = useArchive()
definePageMeta({ validate: route => String(route.params.owner).toLowerCase() === useArchive().archive.user.login.toLowerCase() })
useArchiveSeo(`时间长河 · ${archive.user.login}`, '按年份探索公开项目、版本发布与个人记录。')
const filters = useProjectFilters({ milestones: true })
const events = computed(() => timelineEvents(filters.matchingProjects.value).filter(event => Number(event.date.slice(0, 4)) >= filters.startYear.value && Number(event.date.slice(0, 4)) <= filters.endYear.value))
const groups = computed(() => [...new Set(events.value.map(event => Number(event.date.slice(0, 4))))].sort((a, b) => b - a).map(year => ({ year, events: events.value.filter(event => Number(event.date.slice(0, 4)) === year) })))
const monthsOpen = ref<Record<number, boolean>>({})
function jump(year: number) { document.getElementById(`year-${year}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }) }
</script>
<template>
  <div class="explore-page"><ArchiveFilters /><section class="explore-content timeline-content"><div class="explore-heading"><div><p class="eyebrow">DEVELOPMENT TIMELINE</p><h1>时间长河<span class="heading-period">{{ filters.minYear }} — {{ filters.maxYear }}</span></h1><p>回到一个想法，第一次被保存的日子。</p></div><NuxtLink :to="{ path: universePath, query: $route.query }" class="text-link">回到开发宇宙<AppIcon name="right" /></NuxtLink></div>
    <nav class="year-nav" aria-label="跳转年份"><button v-for="group in groups" :key="group.year" @click="jump(group.year)">{{ group.year }}<span>{{ group.events.length }}</span></button></nav>
    <div v-if="!groups.length" class="empty-state">当前筛选下没有项目。<button class="text-link" @click="filters.reset">清除筛选</button></div>
    <section v-for="group in groups" :id="`year-${group.year}`" :key="group.year" class="timeline-year"><div class="timeline-year-heading"><h2>{{ group.year }}</h2><span>{{ group.events.filter(event => event.kind === 'project').length }} 个项目 · {{ group.events.filter(event => event.kind === 'milestone').length }} 个里程碑</span><button class="text-link" :aria-expanded="!!monthsOpen[group.year]" @click="monthsOpen[group.year] = !monthsOpen[group.year]">{{ monthsOpen[group.year] ? '收起月份' : '展开月份' }}<AppIcon name="chevron" :size="15" /></button></div>
      <div class="timeline-entries"><template v-for="(event, index) in group.events" :key="event.id"><div v-if="monthsOpen[group.year] && (!index || event.date.slice(5, 7) !== group.events[index - 1]?.date.slice(5, 7))" class="timeline-month">{{ Number(event.date.slice(5, 7)) }} 月</div><NuxtLink :to="projectPath(event.project.id)" class="timeline-entry" :data-event="event.id" :style="{ '--project-color': categoryColor(event.project.category) }"><div class="timeline-date"><span>{{ dateLabel(event.date).slice(5) }}</span><small>{{ event.source === 'personal' ? '个人记录' : event.kind === 'milestone' ? 'GitHub Release' : '仓库创建' }}</small></div><i class="timeline-node" /><div class="timeline-entry-content"><span class="eyebrow">{{ event.project.category }}<span v-if="event.kind === 'milestone'"> · {{ event.project.title }}</span><span v-if="event.project.archived"> · 已归档</span><span v-if="event.project.fork"> · Fork</span></span><h3>{{ event.title }}<AppIcon name="arrow" :size="20" /></h3><p v-if="event.kind === 'project'">{{ event.project.description || '查看公开仓库及项目档案。' }}</p><span class="timeline-tech">{{ event.project.technologies.slice(0, 4).join(' / ') }}</span></div></NuxtLink></template></div>
    </section><YearRange milestones /><p class="data-footnote">时间为 UTC。仓库创建时间不一定代表实际开发开始；个人补充的日期另行标注。</p>
  </section></div>
</template>
