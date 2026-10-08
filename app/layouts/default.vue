<script setup lang="ts">
const { archive, universePath, timelinePath } = useArchive()
const brand = '代码时光机'
</script>
<template>
  <div class="site-shell">
    <a class="skip-link" href="#main">跳到主要内容</a>
    <header class="site-header">
      <NuxtLink to="/" class="brand" :aria-label="`${brand} 首页`"><img src="/favicon.svg" alt="" width="38" height="38"><span>{{ brand }}</span></NuxtLink>
      <nav aria-label="主要导航">
        <NuxtLink :to="universePath" :class="{ active: $route.path === universePath }"><AppIcon name="orbit" />开发宇宙</NuxtLink>
        <NuxtLink :to="timelinePath" :class="{ active: $route.path === timelinePath }"><AppIcon name="calendar" />时间长河</NuxtLink>
        <a :href="archive.user.url" target="_blank" rel="noopener noreferrer" class="github-nav"><AppIcon name="github" />GitHub <AppIcon name="external" :size="14" /></a>
      </nav>
    </header>
    <main id="main"><slot /></main>
    <footer class="site-footer"><span>代码时光机 · Every repository tells a story.</span><span>数据同步于 {{ archive.generatedAt.slice(0, 10) }} <span class="footer-dot">·</span> 基于已公开的仓库档案</span></footer>
  </div>
</template>
