<script setup lang="ts">
import CodeStack from '~/components/home/CodeStack.vue'
import ProjectSky from '~/components/home/ProjectSky.vue'
import TypewriterHeadline from '~/components/home/TypewriterHeadline.vue'
const { archive, universePath, timelinePath, projectPath, projectYear, categoryColor } = useArchive()
useArchiveSeo(archive.site.title, archive.site.description)
const featured = computed(() => archive.projects.filter(project => project.featured).sort((a, b) => b.date.localeCompare(a.date)))
const years = archive.projects.map(projectYear)
const earliestYear = years.length ? Math.min(...years) : Number(archive.generatedAt.slice(0, 4))
const latestYear = years.length ? Math.max(...years) : earliestYear
const commitDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
const languages = [...new Set(archive.projects.map(project => project.category))].map(name => ({ name, count: archive.projects.filter(project => project.category === name).length })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
const projectByRepository = new Map(archive.projects.flatMap(project => project.repositoryIds.map(id => [id, project] as const)))
const recent = archive.repositories.flatMap(repo => (repo.commits ?? []).map(commit => ({ ...commit, repository: repo.fullName, project: projectByRepository.get(repo.id)! })))
  .sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.sha.localeCompare(b.sha)).slice(0, 5)
</script>
<template>
  <div class="home-page page-width">
    <section class="home-hero">
      <div class="hero-copy"><p class="eyebrow">{{ archive.user.login.toUpperCase() }} <span>/</span> DEVELOPER ARCHIVE</p><TypewriterHeadline :headline="archive.site.headline" /><p class="hero-description">{{ archive.site.intro }}</p><div class="hero-actions"><NuxtLink :to="universePath" class="button primary">探索开发宇宙<AppIcon name="arrow" /></NuxtLink><NuxtLink :to="timelinePath" class="button secondary">沿时间回溯<AppIcon name="right" /></NuxtLink></div></div>
      <div class="hero-visual"><CodeStack /></div>
    </section>
    <section class="home-stats" aria-label="档案概览"><div><strong>{{ archive.projects.length }}</strong><span><AppIcon name="grid" />项目档案<small>由 {{ archive.repositories.length }} 个公开仓库整理</small></span></div><div><strong>{{ latestYear - earliestYear + 1 }}<em>年</em></strong><span><AppIcon name="calendar" />时间跨度<small>{{ earliestYear }} — {{ latestYear }} 的仓库记录</small></span></div><div><strong>{{ featured.length }}</strong><span><AppIcon name="star" />精选作品<small>值得停下来了解的想法</small></span></div><div><strong>{{ new Set(archive.repositories.map(repo => repo.language).filter(Boolean)).size }}</strong><span><AppIcon name="code" />主要语言<small>来自 GitHub 仓库元数据</small></span></div></section>
    <section class="home-discovery" aria-labelledby="sky-heading"><div class="discovery-heading"><div><p class="eyebrow">FEATURED PROJECTS</p><h2 id="sky-heading">每个想法，<br>都可以是<span class="accent-text">一颗星星。</span></h2><p>星光记录最近的更新。点击一颗星星，直接探索它的 GitHub 仓库，<br>了解背后的故事、技术与思考。</p></div></div><ProjectSky :projects="archive.projects" :featured="featured.slice(0, 3)" /></section>
    <section class="home-signals"><div class="language-paths"><p class="eyebrow">{{ archive.user.login.toUpperCase() }} / TECHNOLOGY</p><h2>换一种语言，<span class="accent-text">继续探索。</span></h2><p>沿着技术的线索，发现新的作品。</p><div class="language-links"><NuxtLink v-for="language in languages" :key="language.name" :style="{ '--language-color': categoryColor(language.name) }" :to="{ path: universePath, query: { category: language.name, forks: '1' } }"><LanguageIcon :language="language.name" /><span class="language-name">{{ language.name }}</span><span class="language-count">{{ language.count }}</span><AppIcon name="arrow" :size="14" /></NuxtLink></div></div>
      <div class="home-recent"><p class="eyebrow">{{ archive.user.login.toUpperCase() }} / ACTIVITY</p><div class="recent-heading"><h2>最近留下的痕迹</h2><AppIcon name="branch" :size="20" /></div><p>公开仓库的最新提交，记录于本次同步。</p><div v-for="commit in recent" :key="`${commit.repository}-${commit.sha}`" class="home-commit"><div class="commit-date"><time :datetime="commit.date">{{ commitDate.format(new Date(commit.date)) }} UTC+8</time><a class="commit-sha button secondary" :href="commit.url" target="_blank" rel="noopener noreferrer"><code>{{ commit.sha.slice(0, 7) }}</code><AppIcon name="external" :size="12" /></a></div><a class="home-commit-message button secondary" :title="commit.message.split('\n')[0]" :href="commit.url" target="_blank" rel="noopener noreferrer">{{ commit.message.split('\n')[0] }}</a><NuxtLink :to="projectPath(commit.project.id)" class="commit-project button secondary" :title="commit.project.title"><span>{{ commit.project.title }}</span><AppIcon name="right" :size="12" /></NuxtLink></div><p v-if="!recent.length">暂无公开提交记录。</p></div>
    </section>
    <section class="home-finale" aria-labelledby="finale-heading"><p class="eyebrow">{{ archive.user.login.toUpperCase() }} / JOURNEY</p><div class="finale-heading"><h2 id="finale-heading">想法会变，<br><span>走过的路留下来。</span></h2><NuxtLink :to="timelinePath" class="finale-link"><span>沿着时间，继续探索</span><AppIcon name="arrow" :size="28" /></NuxtLink></div><div class="finale-track" aria-hidden="true"><span>{{ earliestYear }}</span><div class="track-line"><i /><i /><i /><i /><i /></div><span>{{ latestYear }}</span></div><div class="journey-stages"><div v-for="(stage, index) in ['起点', '积累', '沉淀', '探索', '未来']" :key="stage"><strong>{{ stage }}</strong><span>{{ ['公开开发档案的开始', '记录想法与实验', '把尝试沉淀为作品', '在不同的技术领域继续尝试', '下一行代码，下一段旅程'][index] }}</span></div></div><div class="finale-note"><span>公开仓库里的开发足迹</span><span>下一行代码，下一段旅程。</span></div></section>
  </div>
</template>
<style scoped>
.home-hero { grid-template-columns: .9fr 1.1fr; gap: 28px; padding-top: 24px; padding-bottom: 24px; }
.home-discovery { padding: 40px 0 0; }
.discovery-heading { display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 20px; }
.discovery-heading h2, .home-signals h2 { font-size: 30px; font-weight: 550; letter-spacing: -.03em; margin: 0 0 12px; }
.discovery-heading p, .home-signals > div > p { color: var(--muted); font-size: 13px; }
.home-signals { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 40px 0 16px; }
.home-signals h2 { font-size: 26px; }
.language-paths { display: flex; flex-direction: column; }
.language-links { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: minmax(40px, 1fr); gap: 10px; margin-top: 18px; flex: 1; align-content: stretch; }
.language-links a { display: flex; align-items: center; gap: 10px; padding: 6px 10px;  font-size: 15px; min-height: 38px; }

.language-links .language-count { margin-left: auto; color: #a6b6ce; font: 10px var(--font-mono); }
.language-links svg:last-child { color: var(--muted); }
.recent-heading { display: flex; justify-content: space-between; align-items: center; color: #dbe7f7; }
.recent-heading h2 { margin-bottom: 12px; }
.home-commit { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 8px; border-bottom: 1px solid var(--line); padding: 10px 0; }
.commit-date { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #a7b9d0; font: 11px var(--font-mono); }
.commit-date a { display: flex; gap: 5px; align-items: center; }
.home-commit-message { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; font-size: 14px; line-height: 1.5; margin: 0; padding: 4px 8px; min-height: 30px; }
.commit-sha { min-height: 24px; padding: 2px 6px; font-size: 11px; }
.commit-project { display: inline-flex; align-items: center; gap: 5px; max-width: 140px; min-height: 30px; padding: 4px 7px; font-size: 12px; color: var(--accent); }
.commit-project span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.commit-project svg { flex-shrink: 0; }
.home-finale { margin-top: 32px; padding: 40px 0; border-top: 1px solid #31415a; }
.finale-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; }
.finale-heading h2 { margin: 0; font-size: clamp(32px, 4vw, 56px); line-height: 1.4; letter-spacing: -.035em; font-weight: 550; }
.finale-heading h2 span { color: var(--lilac); }
.finale-link { display: flex; justify-content: space-between; align-items: center; gap: 35px; padding: 12px 16px; font-size: 14px; color: #e6d4ff; }
.finale-link svg { transition: transform .2s; }
.finale-link:hover svg { transform: translate(3px,-3px); }
.finale-track { display: flex; align-items: center; gap: 22px; margin-top: 48px; color: #a1b6d1; font: 11px var(--font-mono); }
.track-line { display: flex; align-items: center; justify-content: space-between; width: 100%; height: 1px; background: linear-gradient(90deg, var(--coral), var(--gold), var(--mint), var(--sky), var(--lilac)); }
.track-line i { height: 5px; width: 5px; border-radius: 50%; background: #a9c5e9; outline: 6px solid var(--bg); }
.track-line i:last-child { width: 8px; height: 8px; background: #edf5ff; }
.finale-note { display: flex; justify-content: space-between; gap: 20px; margin-top: 18px; color: #96a9c3; font-size: 11px; }
@media (max-width: 1000px) { .home-hero { gap: 24px; } .home-signals { gap: 40px; } }
@media (max-width: 768px) { .commit-project { max-width: 100px; } .commit-date { font-size: 10px; } .home-finale { margin-top: 28px; padding: 32px 0; } .finale-heading { align-items: flex-start; flex-direction: column; gap: 22px; } .finale-link { width: 100%; font-size: 13px; } .finale-track { margin-top: 32px; gap: 12px; } .finale-note { font-size: 10px; flex-wrap: wrap; gap: 6px; } .language-links { grid-auto-rows: minmax(40px, 1fr); } .home-hero { grid-template-columns: 1fr; padding-top: 24px; padding-bottom: 24px; gap: 20px; } .home-discovery { padding-top: 32px; } .discovery-heading { align-items: flex-start; flex-direction: column; gap: 16px; } .discovery-heading h2 { font-size: 25px; } .home-signals { grid-template-columns: 1fr; padding-top: 32px; gap: 20px; } .home-signals h2 { font-size: 24px; } }
@media (prefers-reduced-motion: reduce) { .finale-link svg { transition: none; } }
</style>
