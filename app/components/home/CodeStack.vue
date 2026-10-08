<script setup lang="ts">
import CodeWindow from './CodeWindow.vue'
const languages = ['TypeScript', 'Python', 'Shell']
</script>
<template>
  <div class="code-stack" aria-label="固定堆叠的代码窗口">
    <div class="code-stack-stage">
      <div v-for="(language, index) in languages" :key="language" class="code-layer" :class="[`code-layer-${index}`, { 'layer-front': index === 0 }]">
        <CodeWindow :initial-tab="index" :animate="index === 0" :inert="index !== 0" :aria-hidden="index !== 0 ? 'true' : undefined" />
      </div>
    </div>
  </div>
</template>
<style scoped>
.code-stack-stage { position: relative; height: 520px; isolation: isolate; }
.code-layer { position: absolute; width: calc(100% - 62px); transform-origin: center; }
.code-layer-0 { left: 22px; top: 50px; transform: rotate(-2deg); z-index: 3; }
.code-layer-1 { left: 0; top: 85px; transform: rotate(-7deg); z-index: 2; pointer-events: none; }
.code-layer-2 { left: 56px; top: 15px; transform: rotate(5deg); z-index: 1; pointer-events: none; }
.code-layer :deep(.code-window-body) { height: 300px; padding-block: 18px; }
.code-layer :deep(.code-line) { min-height: 24px; line-height: 24px; font-size: 14px; }
.code-layer :deep(.code-window) { border-color: #ac82cc70; box-shadow: 0 20px 40px #07031155; }
.code-layer-1 :deep(.code-window) { border-color: #efa47470; }
.code-layer-2 :deep(.code-window) { border-color: #72ceb570; }
.layer-front :deep(.code-window-toolbar) { position: relative; overflow: hidden; }
.layer-front :deep(.code-window-toolbar:before) { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(110deg, transparent 30%, #ffd0ac28 50%, transparent 70%); transform: translateX(-100%); animation: editor-light-pass 1.2s cubic-bezier(.16, 1, .3, 1) .15s both; }
@keyframes editor-light-pass { to { transform: translateX(100%); } }
@media (max-width: 1000px) and (min-width: 769px) { .code-layer :deep(.code-line) { font-size: 12px; } .code-layer :deep(.code-window-toolbar [role=tablist]) { gap: 12px; } .code-layer :deep(.code-window-toolbar button) { font-size: 12px; } }
@media (max-width: 768px) {
  .code-stack-stage { height: 450px; }
  .code-layer { width: calc(100% - 36px); }
  .code-layer-0 { left: 12px; top: 34px; }
  .code-layer-1 { left: 0; top: 64px; }
  .code-layer-2 { left: 30px; top: 10px; }
  .code-layer :deep(.code-window-body) { height: 275px; padding-block: 18px; }
  .code-layer :deep(.code-window-toolbar) { padding-inline: 12px; }
  .code-layer :deep(.code-window-toolbar [role=tablist]) { gap: 10px; }
  .code-layer :deep(.code-window-toolbar button) { font-size: 12px; }
  .code-layer :deep(.code-window-actions) { gap: 5px; }
  .code-layer :deep(.code-window-status) { font-size: 10px; padding: 12px; }
  .code-layer :deep(.code-line) { min-height: 21px; line-height: 21px; }
}
@media (prefers-reduced-motion: reduce) { .layer-front :deep(.code-window-toolbar:before) { animation: none; display: none; } }
</style>
