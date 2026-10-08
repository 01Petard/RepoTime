<script setup lang="ts">
const props = defineProps<{ milestones?: boolean }>()
const filters = useProjectFilters({ milestones: props.milestones })
function changeStart(event: Event) { const year = Number((event.target as HTMLInputElement).value); void filters.update('from', String(Math.min(year, filters.endYear.value))) }
function changeEnd(event: Event) { const year = Number((event.target as HTMLInputElement).value); void filters.update('to', String(Math.max(year, filters.startYear.value))) }
</script>
<template>
  <div class="year-range">
    <div class="range-heading"><span>时间范围</span><strong>{{ filters.startYear.value }} <span>—</span> {{ filters.endYear.value }}</strong><button @click="filters.update('from', undefined).then(() => filters.update('to', undefined))">全部年份</button></div>
    <div class="range-inputs"><label><span>起始年份</span><input aria-label="起始年份" type="range" :min="filters.minYear" :max="filters.maxYear" :value="filters.startYear.value" @input="changeStart"></label><label><span>结束年份</span><input aria-label="结束年份" type="range" :min="filters.minYear" :max="filters.maxYear" :value="filters.endYear.value" @input="changeEnd"></label></div>
    <div class="range-ticks"><span>{{ filters.minYear }}</span><span>{{ Math.round((filters.minYear + filters.maxYear) / 2) }}</span><span>{{ filters.maxYear }}</span></div>
  </div>
</template>
