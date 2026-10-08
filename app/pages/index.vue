<script setup lang="ts">
import CodeStack from '~/components/home/CodeStack.vue'
import ProjectSky from '~/components/home/ProjectSky.vue'
import { categoryColor } from '#shared/archive' 
const { archive, universePath, timelinePath, projectPath, projectYear } = useArchive()
useArchiveSeo(archive.site.title, archive.site.description)
const featured = computed(() => archive.projects.filter(project => project.featured).sort((a, b) => b.date.localeCompare(a.date)))
const years = archive.projects.map(projectYear)
const earliestYear = years.length ? Math.min(...years) : Number(archive.generatedAt.slice(0, 4))
const latestYear = years.length ? Math.max(...years) : earliestYear
const headline = archive.site.headline.split('\n')
const languages = [...new Set(archive.projects.map(project => project.category))].map(name => ({ name, count: archive.projects.filter(project => project.category === name).length })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
const projectByRepository = new Map(archive.projects.flatMap(project => project.repositoryIds.map(id => [id, project] as const)))
const recent = archive.repositories.flatMap(repo => (repo.commits ?? []).map(commit => ({ ...commit, repository: repo.fullName, project: projectByRepository.get(repo.id)! })))
  .sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.sha.localeCompare(b.sha)).slice(0, 3)
</script>
<template>
  <div class="home-page page-width">
    <section class="home-hero">
      <div class="hero-copy"><p class="eyebrow">{{ archive.user.login.toUpperCase() }} <span>/</span> DEVELOPER ARCHIVE</p><h1><span v-for="(line, index) in headline" :key="line" :class="{ 'accent-text': index === headline.length - 1 }">{{ line }}</span></h1><p class="hero-description">{{ archive.site.intro }}</p><div class="hero-actions"><NuxtLink :to="universePath" class="button primary">探索开发宇宙<AppIcon name="arrow" /></NuxtLink><NuxtLink :to="timelinePath" class="button secondary">沿时间回溯<AppIcon name="right" /></NuxtLink></div></div>
      <div class="hero-visual"><CodeStack /></div>
    </section>
    <section class="home-stats" aria-label="档案概览"><div><strong>{{ archive.projects.length }}</strong><span>项目档案<small>由 {{ archive.repositories.length }} 个公开仓库整理</small></span></div><div><strong>{{ latestYear - earliestYear + 1 }}<em>年</em></strong><span>时间跨度<small>{{ earliestYear }} — {{ latestYear }} 的仓库记录</small></span></div><div><strong>{{ featured.length }}</strong><span>精选作品<small>值得停下来了解的想法</small></span></div><div><strong>{{ new Set(archive.repositories.map(repo => repo.language).filter(Boolean)).size }}</strong><span>主要语言<small>来自 GitHub 仓库元数据</small></span></div></section>
    <section class="featured-section"><div class="section-heading"><div><p class="eyebrow">SELECTED PROJECTS <span class="overline-rule" /></p><h2>留下坐标的作品</h2><p>记录重要的尝试，也记录它们发生的时间。</p></div><NuxtLink :to="universePath" class="text-link">探索全部项目<AppIcon name="right" /></NuxtLink></div><div v-if="featured.length" class="project-grid"><ProjectCard v-for="(project, index) in featured" :key="project.id" :project="project" :index="index" /></div><div v-else class="empty-state">暂未设置精选作品，前往开发宇宙浏览全部项目。</div></section>
    <section class="home-discovery" aria-labelledby="sky-heading"><div class="discovery-heading"><div><h2 id="sky-heading">每个想法，都可以是一颗星。</h2><p>星光记录最近的更新。点击一颗星，直接探索它的 GitHub 仓库。</p></div><NuxtLink :to="universePath" class="text-link">进入完整宇宙<AppIcon name="arrow" /></NuxtLink></div><ProjectSky :projects="featured" /></section>
    <section class="home-signals"><div class="language-paths"><h2>换一种语言，继续探索。</h2><p>沿着技术的线索，发现新的作品。</p><div class="language-links"><NuxtLink v-for="language in languages" :key="language.name" :to="{ path: universePath, query: { category: language.name, forks: '1' } }"><i :style="{ background: categoryColor(language.name) }" />{{ language.name }}<span>{{ language.count }}</span><AppIcon name="arrow" :size="14" /></NuxtLink></div></div>
      <div class="home-recent"><div class="recent-heading"><h2>最近留下的痕迹</h2><AppIcon name="branch" :size="20" /></div><p>公开仓库的最新提交，记录于本次同步。</p><div v-for="commit in recent" :key="`${commit.repository}-${commit.sha}`" class="home-commit"><div class="commit-date"><time :datetime="commit.date">{{ commit.date.slice(0, 10) }}</time><a :href="commit.url" target="_blank" rel="noopener noreferrer"><code>{{ commit.sha.slice(0, 7) }}</code><AppIcon name="external" :size="12" /></a></div><a class="home-commit-message" :href="commit.url" target="_blank" rel="noopener noreferrer">{{ commit.message.split('\n')[0] }}</a><NuxtLink :to="projectPath(commit.project.id)" class="commit-project">{{ commit.project.title }}<AppIcon name="right" :size="12" /></NuxtLink></div><p v-if="!recent.length">暂无公开提交记录。</p></div>
    </section>
    <section class="home-finale" aria-labelledby="finale-heading"><div class="finale-heading"><h2 id="finale-heading">想法会变，<br><span>走过的路留下来。</span></h2><NuxtLink :to="timelinePath" class="finale-link"><span>沿着时间，继续探索</span><AppIcon name="arrow" :size="28" /></NuxtLink></div><div class="finale-track" aria-hidden="true"><span>{{ earliestYear }}</span><div class="track-line"><i /><i /><i /><i /><i /></div><span>{{ latestYear }}</span></div><div class="finale-note"><span>{{ archive.user.login }} 的公开开发档案</span><span>下一行代码，下一段旅程。</span></div></section>
  </div>
</template>
<style scoped>
.home-hero { grid-template-columns: .9fr 1.1fr; gap: 48px; padding-top: 20px; padding-bottom: 70px; }
.home-discovery { padding: 80px 0 0; }
.discovery-heading { display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 30px; }
.discovery-heading h2, .home-signals h2 { font-size: 30px; font-weight: 550; letter-spacing: -.03em; margin: 0 0 12px; }
.discovery-heading p, .home-signals > div > p { color: var(--muted); font-size: 13px; }
.home-signals { display: grid; grid-template-columns: 1fr 1fr; gap: 70px; padding: 80px 0 20px; }
.home-signals h2 { font-size: 26px; }
.language-paths { display: flex; flex-direction: column; }
.language-links { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 1fr; gap: 10px; margin-top: 28px; flex: 1; }
.language-links a { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--surface); border: 1px solid #31415a; border-radius: 6px; font-size: 12px; min-height: 44px; }
.language-links a:hover { border-color: var(--accent); }
.language-links i { height: 6px; width: 6px; border-radius: 50%; }
.language-links span { margin-left: auto; color: #a6b6ce; font: 10px var(--font-mono); }
.language-links svg { color: var(--muted); }
.recent-heading { display: flex; justify-content: space-between; align-items: center; color: #dbe7f7; }
.recent-heading h2 { margin-bottom: 12px; }
.home-commit { border-bottom: 1px solid var(--line); padding: 20px 0; }
.commit-date { display: flex; align-items: center; justify-content: space-between; gap: 14px; color: #a7b9d0; font: 10px var(--font-mono); }
.commit-date a { display: flex; gap: 6px; align-items: center; }
.home-commit-message { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; font-size: 14px; margin: 9px 0; }
.commit-project { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; color: var(--accent); }
.home-finale { margin-top: 75px; padding: 55px 0 70px; border-top: 1px solid #31415a; }
.finale-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; }
.finale-heading h2 { margin: 0; font-size: clamp(32px, 4vw, 56px); line-height: 1.4; letter-spacing: -.035em; font-weight: 550; }
.finale-heading h2 span { color: #a5bcd9; }
.finale-link { display: flex; justify-content: space-between; align-items: center; gap: 35px; padding: 18px 0; border-bottom: 1px solid #8ba9cf; font-size: 14px; color: #c4d7f1; }
.finale-link svg { transition: transform .2s; }
.finale-link:hover svg { transform: translate(3px,-3px); }
.finale-track { display: flex; align-items: center; gap: 22px; margin-top: 48px; color: #a1b6d1; font: 11px var(--font-mono); }
.track-line { display: flex; align-items: center; justify-content: space-between; width: 100%; height: 1px; background: linear-gradient(90deg,#425773,#94c5ff); }
.track-line i { height: 5px; width: 5px; border-radius: 50%; background: #a9c5e9; outline: 6px solid var(--bg); }
.track-line i:last-child { width: 8px; height: 8px; background: #edf5ff; }
.finale-note { display: flex; justify-content: space-between; gap: 20px; margin-top: 18px; color: #96a9c3; font-size: 11px; }
@media (max-width: 1000px) { .home-hero { gap: 24px; } .home-signals { gap: 40px; } }
@media (max-width: 768px) { .home-finale { margin-top: 55px; padding: 40px 0 45px; } .finale-heading { align-items: flex-start; flex-direction: column; gap: 22px; } .finale-link { width: 100%; font-size: 13px; } .finale-track { margin-top: 32px; gap: 12px; } .finale-note { font-size: 10px; flex-wrap: wrap; gap: 6px; } .language-links { grid-auto-rows: minmax(48px, auto); } .home-hero { grid-template-columns: 1fr; padding-top: 12px; padding-bottom: 35px; gap: 40px; } .home-discovery { padding-top: 55px; } .discovery-heading { align-items: flex-start; flex-direction: column; gap: 16px; } .discovery-heading h2 { font-size: 25px; } .home-signals { grid-template-columns: 1fr; padding-top: 55px; gap: 48px; } .home-signals h2 { font-size: 24px; } }
@media (prefers-reduced-motion: reduce) { .finale-link svg { transition: none; } }
</style>
