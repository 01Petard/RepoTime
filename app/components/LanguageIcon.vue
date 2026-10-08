<script setup lang="ts">
import { Binary, Boxes, Braces, Code2, CodeXml, Coffee, FileCode2, Hash, Palette, SquareCode, Terminal, Triangle } from 'lucide-vue-next'
import { categoryColor } from '#shared/archive'
const props = withDefaults(defineProps<{ language: string; size?: number }>(), { size: 18 })
const icons = { Java: Coffee, HTML: CodeXml, JavaScript: Braces, TypeScript: SquareCode, 'C#': Hash, Shell: Terminal, Python: Binary, Vue: Triangle, Go: Boxes, CSS: Palette, PHP: FileCode2 }
const icon = computed(() => icons[props.language as keyof typeof icons] ?? Code2)
</script>
<template><component :is="icon" :size="size" :stroke-width="1.8" :style="{ color: categoryColor(language) }" class="language-icon" aria-hidden="true" /></template>
<style scoped>.language-icon { flex-shrink: 0; }</style>
