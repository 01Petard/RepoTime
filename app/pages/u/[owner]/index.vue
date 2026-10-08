<script setup lang="ts">
import { archiveStars } from '#shared/stars'
const { archive, timelinePath } = useArchive()
definePageMeta({ validate: route => String(route.params.owner).toLowerCase() === useArchive().archive.user.login.toLowerCase() })
useArchiveSeo(`开发宇宙 · ${archive.user.login}`, archive.site.description)
const filters = useProjectFilters()
const viewMode = ref<'list' | 'grid' | 'map'>('grid')
const listMode = computed(() => viewMode.value !== 'map')
const route = useRoute()
const sortMode = computed(() => route.query.sort === 'created' ? 'created' : 'activity')
const sortOptions = [{ label: '最近活跃', value: 'activity' }, { label: '创建时间', value: 'created' }]
const activity = archiveStars(archive)
const repositories = new Map(archive.repositories.map(repo => [repo.id, repo]))
const creationTimes = new Map(archive.projects.map(project => [project.id, Math.min(...project.repositoryIds.map(id => Date.parse(repositories.get(id)!.createdAt)))]))
const sortedProjects = computed(() => [...filters.projects.value].sort((a, b) => {
  const first = sortMode.value === 'created' ? creationTimes.get(a.id)! : Date.parse(activity.get(a.id)?.updatedAt ?? '') || 0
  const second = sortMode.value === 'created' ? creationTimes.get(b.id)! : Date.parse(activity.get(b.id)?.updatedAt ?? '') || 0
  return second - first || a.id.localeCompare(b.id)
}))
const progress = useProgressiveList(sortedProjects, 12, listMode)
</script>
<template>
  <div class="explore-page"><ArchiveFilters /><section class="explore-content">
    <div class="explore-heading universe-heading"><div><p class="eyebrow">YOUR DEVELOPMENT UNIVERSE</p><h1>开发宇宙<span class="heading-period">{{ filters.minYear }} — {{ filters.maxYear }}</span></h1><p>每个项目是一颗星，在相连的想法之间探索。</p></div><NuxtLink :to="{ path: timelinePath, query: $route.query }" class="text-link">切换时间长河<AppIcon name="right" /></NuxtLink></div>
    <div class="explore-topline">
      <div class="view-switch"><button :class="{ selected: viewMode === 'list' }" :aria-pressed="viewMode === 'list'" @click="viewMode = 'list'"><AppIcon name="list" :size="16" />列表</button><button :class="{ selected: viewMode === 'grid' }" :aria-pressed="viewMode === 'grid'" @click="viewMode = 'grid'"><AppIcon name="grid" :size="16" />网格</button><button :class="{ selected: !listMode }" :aria-pressed="!listMode" @click="viewMode = 'map'"><AppIcon name="orbit" :size="16" />星图</button></div>
      <div v-show="listMode" class="list-sort">
        <span>列表排序</span>
        <USelect aria-label="项目列表排序" :items="sortOptions" :model-value="sortMode" variant="none" :content="{ align: 'end', sideOffset: 6 }" :ui="{ base: 'sort-select-trigger', trailingIcon: 'sort-select-chevron', content: 'sort-select-menu', item: 'sort-select-option', itemTrailingIcon: 'sort-select-check' }" @update:model-value="filters.update('sort', $event === 'created' ? 'created' : undefined)" />
      </div>
      <div class="project-search"><AppIcon name="search" :size="16" /><input type="search" aria-label="搜索项目" placeholder="寻找一个项目…" :value="filters.queryText.value" @input="filters.update('q', ($event.target as HTMLInputElement).value || undefined)"></div>
    </div>
    <div v-if="!listMode" class="desktop-star-map"><ClientOnly><UniverseMap :projects="filters.projects.value" :focus-filtered="!!filters.category.value || !!filters.queryText.value || filters.startYear.value !== filters.minYear || filters.endYear.value !== filters.maxYear" /><template #fallback><div class="map-loading">星图正在展开。也可以切换列表浏览全部项目。</div></template></ClientOnly></div>
    <div class="browse-projects" :class="{ 'list-visible': listMode, 'compact-list': viewMode === 'list', 'project-grid-view': viewMode === 'grid' }"><div class="mobile-browse-note"><AppIcon name="list" :size="16" />{{ filters.projects.value.length }} 个项目 · 适合小屏幕的档案视图</div><div v-if="filters.projects.value.length" class="browse-grid"><ProjectCard v-for="project in progress.items.value" :key="project.id" :project="project" /></div><div v-if="filters.projects.value.length" :ref="element => progress.sentinel.value = element as HTMLElement"><ProgressiveLoader :shown="progress.items.value.length" :total="sortedProjects.length" :has-more="progress.hasMore.value" @more="progress.loadMore" /></div><div v-else class="empty-state">没有符合筛选条件的项目。<button class="text-link" @click="filters.reset">清除筛选<AppIcon name="reset" /></button></div></div>
    <YearRange /><p class="data-footnote">{{ archive.repositories.length }} 个公开仓库整理为 {{ archive.projects.length }} 个项目。星图以群星散布，细线表示共同语言或已配置的项目关联；星星大小与亮度按 GitHub 最近推送时间分为五档，合并项目取最新仓库时间。截至 {{ archive.generatedAt.slice(0, 10) }}。</p>
  </section></div>
</template>

<style scoped>
.list-sort { display: flex; align-items: center; gap: 9px; margin-left: auto; white-space: nowrap; color: #a0b4ce; font-size: 11px; }
@media (max-width: 768px) { .explore-topline { flex-wrap: wrap; gap: 12px; } .list-sort { margin-left: 0; } .project-search { flex: 1; width: auto; min-width: 120px; } .project-search input { min-width: 0; } }
</style>
