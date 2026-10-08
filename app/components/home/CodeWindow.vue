<script setup lang="ts">
import { useId } from 'vue'
const editorId = useId()
const props = withDefaults(defineProps<{ initialTab?: number; animate?: boolean }>(), { initialTab: 0, animate: true })
const { archive } = useArchive()
const tabs = ['TypeScript', 'Python', 'Shell']
const active = ref(props.initialTab)
const paused = ref(false)
const reduced = ref(false)
const count = ref(Infinity)
const copied = ref(false)
const windowElement = ref<HTMLElement>()
const languages = [...new Set(archive.repositories.map(repo => repo.language).filter(Boolean))].slice(0, 4)
const snippets = [
  `// 从一行代码，到一个开发宇宙\nconst developer = {\n  name: ${JSON.stringify(archive.user.login)},\n  projects: ${archive.projects.length},\n  since: ${JSON.stringify(archive.user.createdAt.slice(0, 4))},\n  languages: ${JSON.stringify(languages)},\n};\n\n// 每个想法，都有自己的坐标\nconst journey = developer.projects;\nconsole.log("Keep building. Keep exploring.");`,
  `# 每个公开仓库，都是一段旅程\ndeveloper = ${JSON.stringify(archive.user.login)}\nprojects = ${archive.projects.length}\nlanguages = ${JSON.stringify(languages)}\n\nfor language in languages:\n    print(f"Exploring {language}")\n\n# 让想法留下来\nprint(f"{developer}: {projects} projects")\nprint("The journey continues.")`,
  `# 开发者档案 · 快照示例\nprintf '%s\\n' ${JSON.stringify(archive.user.login)}\n\n# 已收录的公开记录\nprojects=${archive.projects.length}\nrepositories=${archive.repositories.length}\n\necho "$repositories repositories"\necho "$projects project stories"\n\n# 下一站，开发宇宙\necho "Keep exploring."`,
]
const code = computed(() => snippets[active.value]!)
const visibleLines = computed(() => code.value.slice(0, count.value).split('\n'))
const totalLines = computed(() => code.value.split('\n').length)
function tokens(line: string) {
  return line.split(/(\/\/.*|#.*|"[^"\n]*"|'[^'\n]*'|\b(?:const|for|in|print|console|echo|printf)\b|\b\d+\b|\b(?:log|build)\b)/g).filter(Boolean).map(text => ({ text,
    kind: /^(\/\/|#)/.test(text) ? 'comment' : /^["']/.test(text) ? 'string' : /^\d+$/.test(text) ? 'number' : /^(const|for|in|print|console|echo|printf)$/.test(text) ? 'keyword' : /^(log|build)$/.test(text) ? 'method' : '',
  }))
}
let timer: ReturnType<typeof setTimeout> | undefined
let copyTimer: ReturnType<typeof setTimeout> | undefined
let observer: IntersectionObserver | undefined
let motion: MediaQueryList | undefined
let inView = true
function stop() { clearTimeout(timer) }
function tick() {
  stop()
  if (!props.animate || paused.value || reduced.value || !inView || document.hidden || count.value >= code.value.length) return
  timer = setTimeout(() => {
    count.value = Math.min(code.value.length, count.value + 2)
    tick()
  }, 28)
}
function changeTab(index: number) {
  active.value = (index + tabs.length) % tabs.length
  count.value = !props.animate || paused.value || reduced.value ? code.value.length : 0
  copied.value = false
  tick()
}
function tabKey(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  changeTab(event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : active.value + (event.key === 'ArrowRight' ? 1 : -1))
  nextTick(() => windowElement.value?.querySelector<HTMLButtonElement>('[role=tab][aria-selected=true]')?.focus())
}
function toggle() { paused.value = !paused.value; tick() }
function motionChange() { reduced.value = motion?.matches ?? false; if (reduced.value) count.value = code.value.length; tick() }
async function copy() {
  try { await navigator.clipboard.writeText(code.value); copied.value = true; clearTimeout(copyTimer); copyTimer = setTimeout(() => { copied.value = false }, 2000) } catch { copied.value = false }
}
watch(() => props.animate, enabled => {
  count.value = code.value.length
  tick()
})
onMounted(() => {
  motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  count.value = code.value.length
  motionChange()
  motion.addEventListener('change', motionChange)
  document.addEventListener('visibilitychange', tick)
  observer = new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? false; tick() })
  if (windowElement.value) observer.observe(windowElement.value)
})
onBeforeUnmount(() => { stop(); clearTimeout(copyTimer); observer?.disconnect(); motion?.removeEventListener('change', motionChange); document.removeEventListener('visibilitychange', tick) })
</script>
<template>
  <div ref="windowElement" class="code-window">
    <div class="code-window-toolbar"><div role="tablist" aria-label="代码示例语言" @keydown="tabKey"><button v-for="(tab, index) in tabs" :id="`${editorId}-tab-${index}`" :key="tab" role="tab" :aria-selected="active === index" :aria-controls="`${editorId}-example`" :tabindex="active === index ? 0 : -1" @click="changeTab(index)">{{ tab }}</button></div><div class="code-window-actions"><button class="code-pause" :disabled="reduced" :aria-label="paused ? '继续代码动画' : '暂停代码动画'" @click="toggle"><AppIcon :name="paused ? 'play' : 'pause'" :size="14" /></button><button class="code-copy" :aria-label="copied ? '已复制代码示例' : '复制代码示例'" @click="copy"><AppIcon :name="copied ? 'check' : 'copy'" :size="17" /></button></div></div>
    <div :id="`${editorId}-example`" role="tabpanel" :aria-labelledby="`${editorId}-tab-${active}`" class="code-window-body" tabindex="0"><pre class="sr-only">{{ code }}</pre><div aria-hidden="true" class="code-lines"><div v-for="(_, index) in totalLines" :key="index" class="code-line" :class="{ 'typing-line': index === 9 || index === visibleLines.length - 1 && count < code.length }"><span class="line-number">{{ index + 1 }}</span><code><span v-for="(token, tokenIndex) in tokens(visibleLines[index] ?? '')" :key="tokenIndex" :class="token.kind">{{ token.text }}</span><i v-if="index === visibleLines.length - 1 && count < code.length" class="code-caret" /></code></div></div></div>
    <div class="code-window-status"><span><i />{{ archive.user.login }} / 持续构建示例</span><span class="code-branch"><AppIcon name="branch" :size="15" />main</span></div><span class="sr-only" role="status">{{ copied ? '代码示例已复制' : '' }}</span>
  </div>
</template>
<style scoped>
.code-window { overflow: hidden; border: 1px solid #364358; border-radius: 17px; background: linear-gradient(120deg,#0d1828,#0a1322 75%);  }
.code-window-toolbar { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(120deg,#263c59,#172940); padding: 0 18px; }
.code-window-toolbar [role=tablist] { display: flex; gap: 24px; }
.code-window-toolbar button { border: 0; background: transparent; color: #a6b2c8; padding: 18px 0; font-size: 14px; }
.code-window-toolbar [role=tab] { border-bottom: 2px solid transparent; }
.code-window-toolbar [aria-selected=true] { color: #f3f6ff; border-color: #b7a3ff; }
.code-window-actions { display: flex; align-items: center; gap: 15px; }
.code-pause { opacity: .55; }
.code-pause:hover, .code-pause:focus-visible { opacity: 1; }
.code-copy { min-width: 32px; display: grid; place-items: center; }
.code-window-body { padding: 28px 0 30px; overflow-x: auto; scrollbar-width: thin; }
.code-lines { min-width: max-content; padding-right: 24px; }
.code-line { display: flex; min-height: 27px; font: 15px/27px var(--font-mono); padding-right: 8px; }
.line-number { width: 48px; flex-shrink: 0; color: #8491aa; text-align: right; padding-right: 16px; user-select: none; }
.code-line code { white-space: pre; color: #dce4f4; }
.typing-line { background: #b7a3ff0e; }
.comment { color: #96a5b8; }
.keyword { color: #bdacff; }
.string { color: #6cebd3; }
.method { color: #f1b79a; }
.number { color: #f0bd7b; }
.code-caret { display: inline-block; vertical-align: -3px; width: 7px; height: 15px; background: #b7a3ff; animation: blink 1s steps(2) infinite; }
.code-window-status { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 17px 20px; border-top: 1px solid #303a50; color: #a6b2c8; font: 12px var(--font-mono); }
.code-window-status span { display: flex; align-items: center; gap: 7px; }
.code-window-status i { width: 5px; height: 5px; background: #72dfbc; border-radius: 50%; }
.code-window-body::-webkit-scrollbar { height: 5px; }
.code-window-body::-webkit-scrollbar-track { background: #223249; }
.code-window-body::-webkit-scrollbar-thumb { background: #526c86; }
.code-window-status button { border: 0; background: transparent; display: flex; align-items: center; gap: 5px; color: #b9c7dc; font: inherit; }
.code-window-status button:disabled { cursor: default; }
@keyframes blink { 50% { opacity: 0; } }
@media (max-width: 768px) { .code-window { transform: none; } .code-line { font-size: 11px; } .code-window-toolbar [role=tablist] { gap: 22px; } }
@media (prefers-reduced-motion: reduce) { .code-caret { animation: none; } }
</style>
