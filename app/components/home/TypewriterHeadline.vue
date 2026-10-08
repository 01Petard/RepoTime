<script setup lang="ts">
const props = defineProps<{ headline: string }>()
const phrases = [props.headline, '每一个想法，\n都值得留下。', '从一次提交，\n到一段旅程。', '下一行代码，\n故事仍在继续。']
const text = ref(props.headline)
let phrase = 0
let deleting = false
let timer: ReturnType<typeof setTimeout> | undefined
let motion: MediaQueryList | undefined
function tick() {
  clearTimeout(timer)
  if (motion?.matches || document.hidden) return
  const target = phrases[phrase]!
  let delay = deleting ? 60 : 150
  if (deleting) {
    text.value = text.value.slice(0, -1)
    if (!text.value) { deleting = false; phrase = (phrase + 1) % phrases.length; delay = 650 }
  } else if (text.value.length < target.length) {
    text.value = target.slice(0, text.value.length + 1)
    if (/[，。]/.test(text.value.at(-1)!)) delay = 450
  } else { deleting = true; delay = 2400 }
  timer = setTimeout(tick, delay)
}
function resume() {
  clearTimeout(timer)
  if (motion?.matches) { text.value = props.headline; return }
  if (!document.hidden) timer = setTimeout(tick, 400)
}
onMounted(() => {
  motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (!motion.matches) { text.value = ''; tick() }
  motion.addEventListener('change', resume)
  document.addEventListener('visibilitychange', resume)
})
onBeforeUnmount(() => { clearTimeout(timer); motion?.removeEventListener('change', resume); document.removeEventListener('visibilitychange', resume) })
</script>
<template>
  <h1 class="typewriter-headline"><span class="sr-only">{{ headline.replace('\n', '') }}</span><span aria-hidden="true" class="typewriter-text">{{ text }}<i class="headline-caret" /></span></h1>
</template>
<style scoped>
.typewriter-headline { min-height: 2.5em; }
.typewriter-text { white-space: pre-line; display: block; color: var(--accent); }
.headline-caret { display: inline-block; height: .85em; width: 3px; margin-left: .12em; background: var(--accent); animation: headline-blink 1s steps(2) infinite; }
@keyframes headline-blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .headline-caret { display: none; } }
</style>
