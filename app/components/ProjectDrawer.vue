<script setup lang="ts">
import type { Project } from '../../shared/archive'
const props = defineProps<{ project: Project | null }>()
const emit = defineEmits<{ close: [] }>()
const { archive, projectPath, dateLabel, categoryColor } = useArchive()
const open = computed({ get: () => !!props.project, set: (value: boolean) => { if (!value) emit('close') } })
</script>
<template>
  <USlideover v-model:open="open" :title="project?.title ?? '项目档案'" :description="project ? `${project.category} · ${dateLabel(project.date)}` : ''" :ui="{ content: 'project-slideover', body: 'p-0' }">
    <template #body><div v-if="project" class="drawer-body">
      <img v-if="project.cover" class="drawer-cover" :src="project.cover" :alt="`${project.title} 项目封面`" width="1200" height="400">
      <div class="drawer-content"><span class="eyebrow" :style="{ color: categoryColor(project.category) }">PROJECT ARCHIVE</span><h2>{{ project.title }}</h2><p class="drawer-description">{{ project.description || '这个项目尚未补充简介，可以查看关联的 GitHub 仓库。' }}</p>
      <div class="tech-tags"><span v-for="technology in project.technologies.slice(0, 6)" :key="technology">{{ technology }}</span></div>
      <dl class="drawer-facts"><div><dt>{{ project.dateSource === 'personal' ? '项目开始 · 个人记录' : 'GitHub 仓库创建日期' }}</dt><dd>{{ dateLabel(project.date) }}</dd></div><div><dt>仓库状态</dt><dd>{{ project.archived ? '已归档' : '未归档' }}{{ project.fork ? ' · Fork' : '' }}</dd></div></dl>
      <NuxtLink :to="projectPath(project.id)" class="button primary full" @click="emit('close')">查看完整档案<AppIcon name="arrow" /></NuxtLink>
      <div class="drawer-repos"><span class="eyebrow">关联仓库</span><a v-for="repo in archive.repositories.filter(repo => project?.repositoryIds.includes(repo.id))" :key="repo.id" :href="repo.url" target="_blank" rel="noopener noreferrer"><AppIcon name="github" />{{ repo.name }}<AppIcon name="external" :size="14" /></a></div>
      </div></div></template>
  </USlideover>
</template>
