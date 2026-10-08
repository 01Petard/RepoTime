<script setup lang="ts">
import CodeWindow from './CodeWindow.vue'
const languages = ['TypeScript', 'Python', 'Shell']
const front = ref(0)
function activate(index: number) { front.value = index }
</script>
<template>
  <div class="code-stack" aria-label="交叠的代码窗口">
    <div class="code-stack-stage"><div class="code-stack-backplate" aria-hidden="true"><div>TypeScript<span>…</span></div></div>
      <div v-for="(language, index) in languages" :key="language" class="code-layer" :class="[`code-layer-${index}`, { 'layer-front': front === index }]" :style="{ zIndex: front === index ? 3 : 2 - index }" @pointerenter="activate(index)" @pointerdown="activate(index)">
        <CodeWindow :initial-tab="index" :animate="front === index" :inert="front !== index" />
      </div>
    </div>
    <div class="code-stack-selector" aria-label="选择前面的代码窗口"><span>移到前面</span><button v-for="(language, index) in languages" :key="language" :aria-pressed="front === index" :aria-label="`将 ${language} 窗口移到前面`" @click="activate(index)">{{ language }}</button></div>
  </div>
</template>
<style scoped>
.code-stack { padding: 12px 0 0; }
.code-stack-stage { position: relative; height: 655px; isolation: isolate; }
.code-stack-backplate { position: absolute; width: calc(100% - 52px); height: 475px; left: 20px; top: 82px; border: 1px solid #47749a; border-radius: 17px; background: #101e32; transform: rotate(.5deg); }
.code-stack-backplate > div { height: 65px; background: #1d3049; border-radius: 17px 17px 0 0; padding: 20px; color: #7297bd; font-size: 12px; }
.code-stack-backplate span { float: right; }
.code-layer { position: absolute; width: calc(100% - 52px); transform-origin: center; transition: transform .35s cubic-bezier(.16,1,.3,1); }
.code-layer-0 { left: 6px; top: 110px; transform: rotate(-6deg); }
.code-layer-1 { left: 32px; top: 60px; transform: rotate(-2deg); }
.code-layer-2 { left: 60px; top: 30px; transform: rotate(5deg); }
.code-layer.layer-front { filter: brightness(1.03); }
.code-layer :deep(.code-window-body) { height: 380px; }
.code-layer :deep(.code-window) { box-shadow: 0 18px 38px #00000035; border-color: #5687b7; }
.code-layer:not(.layer-front) :deep(.code-window) { border-color: #3c638c; }
.code-stack-selector { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 14px; font-size: 10px; color: #a0b0c9; margin-top: 4px; }
.code-stack-selector button { background: transparent; border: 0; padding: 8px 0; color: #adbad0; font: inherit; }
.code-stack-selector [aria-pressed=true] { color: #d6caff; text-decoration: underline; text-underline-offset: 5px; }
@media (max-width: 1000px) and (min-width: 769px) { .code-stack-stage { height: 610px; } }
@media (max-width: 768px) { .code-stack-stage { height: 540px; } .code-layer, .code-stack-backplate { width: calc(100% - 48px); } .code-layer-0 { left: 4px; top: 85px; } .code-layer-1 { left: 20px; top: 55px; } .code-layer-2 { left: 35px; top: 25px; } .code-stack-backplate { left: 22px; top: 45px; height: 430px; } .code-layer :deep(.code-window-body) { height: 315px; } .code-stack-selector { gap: 14px; font-size: 11px; } .code-stack-selector > span { display: none; } .code-stack-selector button { min-height: 44px; } }
@media (prefers-reduced-motion: reduce) { .code-layer { transition: none; } }
</style>
