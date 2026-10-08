<script setup lang="ts">
import { recentProjectCommits } from '#shared/archive'
const { archive, universePath, timelinePath, projectPath, dateLabel, categoryColor } = useArchive()
const route = useRoute()
definePageMeta({ validate: route => {
  const { archive } = useArchive()
  const id = String(route.params.projectId)
  return String(route.params.owner).toLowerCase() === archive.user.login.toLowerCase() && archive.projects.some(project => project.id === (archive.aliases[id] ?? id))
} })
const id = computed(() => archive.aliases[String(route.params.projectId)] ?? String(route.params.projectId))
const project = computed(() => archive.projects.find(project => project.id === id.value)!)
const repositories = computed(() => archive.repositories.filter(repo => project.value.repositoryIds.includes(repo.id)))
const commits = computed(() => recentProjectCommits(repositories.value))
const stars = computed(() => repositories.value.reduce((sum, repo) => sum + repo.stars, 0))
const languages = computed(() => new Set(repositories.value.flatMap(repo => Object.keys(repo.languages))).size)
const related = computed(() => archive.relations.filter(relation => [relation.from, relation.to].includes(id.value)).map(relation => ({ ...relation, project: archive.projects.find(project => project.id === (relation.from === id.value ? relation.to : relation.from))! })))
useArchiveSeo(() => `${project.value.title} · ${archive.user.login}`, () => project.value.description || `${project.value.title} 的公开项目档案`, undefined, () => projectPath(project.value.id))
</script>
<template>
  <article class="project-detail page-width" :style="{ '--project-color': categoryColor(project.category) }"><nav class="breadcrumbs" aria-label="当前位置"><NuxtLink :to="universePath">开发宇宙</NuxtLink><AppIcon name="chevron" :size="14" /><span>{{ project.title }}</span></nav>
    <header class="detail-heading"><div><p class="eyebrow">PROJECT ARCHIVE <span>/ {{ project.category }}</span></p><h1>{{ project.title }}</h1><p>{{ project.description || '每个公开项目，都留下了一个可以回望的坐标。' }}</p><div class="tech-tags"><span v-for="technology in project.technologies" :key="technology">{{ technology }}</span></div></div><a :href="repositories[0]?.url" target="_blank" rel="noopener noreferrer" class="button secondary"><AppIcon name="github" />查看 GitHub<AppIcon name="arrow" /></a></header>
    <div class="detail-stats"><div><AppIcon name="star" :size="23" /><strong>{{ stars }}</strong><span>GitHub Stars</span></div><div><AppIcon name="database" :size="23" /><strong>{{ repositories.length }}</strong><span>公开仓库</span></div><div><AppIcon name="code" :size="23" /><strong>{{ languages }}</strong><span>仓库语言</span></div><div><AppIcon name="calendar" :size="23" /><strong>{{ project.date.slice(0, 4) }} — {{ archive.generatedAt.slice(0, 4) }}</strong><span>档案时间跨度</span></div></div>
    <img v-if="project.cover" class="detail-cover" :src="project.cover" :alt="`${project.title} 项目封面`" width="1200" height="400">
    <div class="detail-columns"><div class="detail-main"><section v-if="project.why" class="detail-section"><p class="eyebrow">THE IDEA BEHIND IT</p><h2>为什么做这个项目</h2><p class="personal-story">{{ project.why }}</p><small class="source-label">个人记录</small></section>
      <section class="detail-section repositories-section"><p class="eyebrow"><AppIcon name="database" :size="22" />REPOSITORIES</p><div class="detail-section-heading"><h2>作品背后的仓库<span>{{ repositories.length }}</span></h2><NuxtLink :to="universePath" class="button secondary">浏览更多项目<AppIcon name="right" /></NuxtLink></div><div class="repository-list"><a v-for="repo in repositories" :key="repo.id" :href="repo.url" target="_blank" rel="noopener noreferrer" class="repository-row"><div><AppIcon name="github" /><strong>{{ repo.fullName.replace(/RepoTime/g, '项目时光机') }}</strong><AppIcon name="external" :size="14" /></div><p>{{ repo.description || '仓库尚未填写描述。' }}</p><div class="repo-meta"><span>{{ repo.language || '主语言未标注' }}</span><span><AppIcon name="star" :size="13" />{{ repo.stars }}</span><span v-if="repo.fork"><AppIcon name="fork" :size="13" />Fork</span><span v-if="repo.archived"><AppIcon name="archive" :size="13" />已归档</span><span>最近推送 {{ repo.pushedAt ? dateLabel(repo.pushedAt) : '暂无记录' }}</span></div></a></div></section>
      <section class="detail-section recent-commits"><p class="eyebrow"><AppIcon name="branch" :size="22" />RECENT COMMITS</p><div class="detail-section-heading"><h2>最近提交<span>{{ commits.length }}</span></h2><a v-if="repositories[0]" :href="`${repositories[0].url}/commits`" target="_blank" rel="noopener noreferrer" class="button secondary">查看更多提交<AppIcon name="right" /></a></div><p class="data-footnote">GitHub 默认分支 · 截至本次数据同步</p>
        <div v-for="commit in commits" :key="`${commit.repositoryId}-${commit.sha}`" class="commit-row">
          <a class="commit-title" :href="commit.url" target="_blank" rel="noopener noreferrer">{{ commit.message.split('\n')[0] || '未填写提交说明' }}<AppIcon name="external" :size="14" /></a>
          <details v-if="commit.message.includes('\n') && commit.message.slice(commit.message.indexOf('\n')).trim()"><summary>完整提交说明</summary><p class="commit-body">{{ commit.message }}</p></details>
          <div class="repo-meta"><span>{{ commit.author }}</span><time :datetime="commit.date">{{ commit.date.slice(0, 10) }} {{ commit.date.slice(11, 19) }} UTC</time><a :href="commit.url" :title="commit.sha" target="_blank" rel="noopener noreferrer"><code>{{ commit.sha.slice(0, 7) }}</code></a><span v-if="repositories.length > 1">{{ commit.repositoryName.replace(/RepoTime/g, '项目时光机') }}</span></div>
        </div><div v-if="!commits.length" class="commits-empty"><AppIcon name="list" :size="32" /><strong>暂无提交记录</strong><p>默认分支暂无提交记录，或仓库尚未归档完整数据。</p></div>
      </section>

      <section v-if="related.length" class="detail-section"><h2>关联项目</h2><NuxtLink v-for="relation in related" :key="relation.project.id" :to="projectPath(relation.project.id)" class="related-row">{{ relation.project.title }}<span>{{ relation.label }}</span><AppIcon name="arrow" /></NuxtLink></section>
    </div><aside class="detail-aside"><div class="detail-facts"><span class="eyebrow"><AppIcon name="info" :size="22" />ARCHIVE NOTES</span><h2>项目信息</h2><dl><div><dt>{{ project.dateSource === 'personal' ? '开始日期 · 个人记录' : 'GitHub 仓库创建日期' }}</dt><dd>{{ dateLabel(project.date) }}</dd></div><div><dt>分类来源</dt><dd>GitHub 主语言</dd></div><div><dt>仓库状态</dt><dd>{{ project.archived ? '全部已归档' : '包含未归档仓库' }}{{ project.fork ? ' · Fork' : '' }}</dd></div><div><dt>数据同步日期</dt><dd>{{ dateLabel(archive.generatedAt) }}</dd></div></dl><p>创建日期来自 GitHub 或个人记录，不能直接等同于投入时长与个人贡献。</p></div><div v-if="project.links.length || repositories.some(repo => repo.homepage)" class="detail-links"><span class="eyebrow">ELSEWHERE</span><a v-for="link in project.links" :key="link.url" :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.label }}<AppIcon name="arrow" /></a><a v-for="repo in repositories.filter(repo => repo.homepage)" :key="repo.id" :href="repo.homepage!" target="_blank" rel="noopener noreferrer">{{ repo.name.replace(/RepoTime/g, '项目时光机') }} · 项目主页<AppIcon name="arrow" /></a></div><NuxtLink :to="timelinePath" class="text-link">继续沿时间探索<AppIcon name="right" /></NuxtLink></aside></div>
      <section class="detail-section detail-milestones"><p class="eyebrow"><AppIcon name="activity" :size="22" />MILESTONES</p><div class="detail-section-heading"><h2>项目的时间坐标</h2><NuxtLink :to="timelinePath" class="button secondary">完整时间线<AppIcon name="right" /></NuxtLink></div><div class="milestone-row"><i /><time>{{ dateLabel(project.date) }}</time><div><strong>{{ project.dateSource === 'personal' ? '项目开始' : '关联仓库首次创建' }}</strong><small>{{ project.dateSource === 'personal' ? '个人记录' : 'GitHub 元数据' }}</small></div></div><div v-for="milestone in project.milestones" :key="milestone.id" class="milestone-row"><i /><time>{{ dateLabel(milestone.date) }}</time><div><a v-if="milestone.sourceUrl" :href="milestone.sourceUrl" target="_blank" rel="noopener noreferrer">{{ milestone.title }}<AppIcon name="external" :size="13" /></a><strong v-else>{{ milestone.title }}</strong><small>{{ milestone.source === 'personal' ? '个人记录' : 'GitHub Release' }}</small></div></div><p v-if="!project.milestones.length" class="data-footnote">尚无已发布版本或个人里程碑记录。</p></section>
  </article>
</template>

<style scoped>
.commit-row { padding: 20px 0; border-bottom: 1px solid var(--line); }
.commit-title { display: flex; align-items: baseline; gap: 10px; font-weight: 600; overflow-wrap: anywhere; }
.commit-title svg { flex-shrink: 0; }
.commit-row .repo-meta { margin-top: 12px; }
.commit-row details { margin-top: 12px; color: var(--muted); font-size: 13px; }
.commit-row summary { cursor: pointer; }
.commit-body { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
