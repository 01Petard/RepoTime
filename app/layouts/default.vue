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
        <NuxtLink :to="universePath" :class="{ active: $route.path === universePath }">开发宇宙</NuxtLink>
        <NuxtLink :to="timelinePath" :class="{ active: $route.path === timelinePath }">时间长河</NuxtLink>
        <a :href="archive.user.url" target="_blank" rel="noopener noreferrer" class="github-nav">GitHub <AppIcon name="external" :size="14" /></a>
      </nav>
      <NuxtLink to="/" class="header-profile"><img :src="archive.user.avatarUrl" alt="" width="26" height="26"><span>{{ archive.user.login }}</span></NuxtLink>
    </header>
    <main id="main"><slot /></main>
    <footer class="site-footer"><span>{{ archive.site.brand ?? archive.user.login }} <span class="footer-dot">·</span> Every repository tells a story.</span><span>数据同步于 {{ archive.generatedAt.slice(0, 10) }} <span class="footer-dot">·</span> 公开开发档案</span></footer>
  </div>
</template>
