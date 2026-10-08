<script setup lang="ts">
import type { Project } from '../../shared/archive'
defineProps<{ project: Project; index?: number }>()
const { projectPath, categoryColor, dateLabel } = useArchive()
</script>
<template>
  <NuxtLink :to="projectPath(project.id)" class="project-card" :style="{ '--project-color': categoryColor(project.category) }">
    <ProjectCover :project="project" />
    <div class="project-card-body">
      <div class="project-card-meta"><span><i class="category-dot" />{{ project.category }}</span><span>{{ dateLabel(project.date) }}</span></div>
      <h3>{{ project.title }}<AppIcon name="arrow" :size="22" /></h3>
      <p>{{ project.description || '一个保存在时间坐标里的公开项目。打开档案，了解仓库信息。' }}</p>
      <div class="project-card-bottom"><span>{{ project.technologies.slice(0, 3).join(' / ') || '技术栈未标注' }}</span><span v-if="project.archived">已归档</span><span v-else-if="project.fork">Fork</span><span v-else>{{ project.repositoryIds.length }} 个仓库</span></div>
    </div>
  </NuxtLink>
</template>
