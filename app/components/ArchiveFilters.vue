<script setup lang="ts">
const { archive, categoryColor } = useArchive()
const filters = useProjectFilters()
</script>
<template>
  <aside class="archive-sidebar" aria-label="项目筛选">
    <div class="sidebar-profile"><img :src="archive.user.avatarUrl" :alt="`${archive.user.login} 的头像`" width="46" height="46"><div><strong>{{ archive.user.name }}</strong><span>开发者档案</span></div></div>
    <div class="sidebar-body">
      <div class="sidebar-section">
        <span class="eyebrow">编程语言</span>
        <button class="category-filter" :class="{ selected: !filters.category.value }" @click="filters.update('category', undefined)"><AppIcon name="grid" :size="16" />全部项目<span>{{ archive.projects.length }}</span></button>
        <button v-for="category in filters.categories" :key="category" :style="{ '--language-color': categoryColor(category) }" class="category-filter" :class="{ selected: filters.category.value === category }" @click="filters.update('category', category)"><LanguageIcon :language="category" />{{ category }}<span>{{ archive.projects.filter(project => project.category === category).length }}</span></button>
      </div>
      <div class="sidebar-section status-filters"><span class="eyebrow">仓库状态</span>
        <UCheckbox :model-value="filters.showForks.value" label="显示 Fork 项目" @update:model-value="filters.update('forks', $event ? '1' : undefined)" />
        <UCheckbox :model-value="filters.showArchived.value" label="显示已归档项目" @update:model-value="filters.update('archived', $event ? undefined : '0')" />
      </div>
      <div class="sidebar-note"><i class="live-dot" />静态公开档案<p>按 GitHub 主语言分类。项目日期来自仓库创建时间或个人记录。</p></div>
    </div>
  </aside>
</template>
