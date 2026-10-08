<script setup lang="ts">
import type { NuxtError } from '#app'
defineProps<{ error: NuxtError }>()
</script>
<template><div class="error-page"><img src="/favicon.svg" alt="" width="64" height="64"><p class="eyebrow">REPO TIME / {{ error.statusCode }}</p><h1>{{ error.statusCode === 404 ? '这个坐标，还没有故事。' : '档案暂时无法展开。' }}</h1><p>{{ error.statusCode === 404 ? '这座档案馆只展示站点所有者已发布的项目。' : '请稍后再试。' }}</p><button class="button primary" @click="clearError({ redirect: '/' })">回到档案首页<AppIcon name="right" /></button></div></template>
