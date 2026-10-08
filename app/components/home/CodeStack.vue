<script setup lang="ts">
import CodeWindow from './CodeWindow.vue'
const languages = ['TypeScript', 'Python', 'Shell']
const front = ref(0)
function activate(index: number) { front.value = index }
</script>
<template>
  <div class="code-stack" aria-label="交叠的代码窗口">
    <div class="code-stack-stage">
      <div v-for="(language, index) in languages" :key="language" class="code-layer" :class="[`code-layer-${index}`, { 'layer-front': front === index }]" :style="{ zIndex: front === index ? 3 : 2 - index }" @pointerenter="activate(index)" @pointerdown="activate(index)">
        <CodeWindow :initial-tab="index" :animate="front === index" :inert="front !== index" />
      </div>
    </div>
    <div class="code-stack-selector" aria-label="选择前面的代码窗口"><span>移到前面</span><button v-for="(language, index) in languages" :key="language" :aria-pressed="front === index" :aria-label="`将 ${language} 窗口移到前面`" @click="activate(index)">{{ language }}</button></div>
  </div>
</template>
<style scoped>
.code-stack { padding: 12px 0 0; }
.code-stack-stage { position: relative; height: 560px; isolation: isolate; }
.code-layer { position: absolute; width: calc(100% - 62px); transform-origin: 100% 100%; transition: transform .35s cubic-bezier(.16,1,.3,1); }
.code-layer-0 { left: 46px; top: 34px; transform: rotate(-6deg); }
.code-layer-1 { left: 46px; top: 34px; transform: rotate(-2deg); }
.code-layer-2 { left: 46px; top: 34px; transform: rotate(2deg); }
.code-layer.layer-front { filter: brightness(1.03); }
.code-layer :deep(.code-window-body) { height: 355px; }
.code-layer :deep(.code-window) { box-shadow: 0 18px 38px #00000035; border-color: #45506a; }
.code-layer:not(.layer-front) :deep(.code-window) { border-color: #3a465e; }
.code-stack-selector { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 14px; font-size: 10px; color: #a0b0c9; margin-top: 4px; }
.code-stack-selector button { background: transparent; border: 0; padding: 8px 0; color: #adbad0; font: inherit; }
.code-stack-selector [aria-pressed=true] { color: #d6caff; text-decoration: underline; text-underline-offset: 5px; }
@media (max-width: 1000px) { .code-stack-stage { height: 560px; } }
@media (max-width: 768px) { .code-stack-stage { height: 560px; } .code-layer { width: calc(100% - 62px); } .code-layer-0, .code-layer-1, .code-layer-2 { left: 46px; top: 34px; } .code-stack-selector { gap: 14px; font-size: 11px; } .code-stack-selector > span { display: none; } .code-stack-selector button { min-height: 44px; } }
@media (prefers-reduced-motion: reduce) { .code-layer { transition: none; } }
</style>
