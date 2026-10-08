import { scaleUtc } from 'd3-scale'
import { categoryColor, type Project } from './archive'

export interface StarNode { project: Project; x: number; y: number; color: string; radius: number; labelX: number; labelAnchor: 'start' | 'end'; labelWidth: number }
export function layoutUniverse(projects: Project[], width = 1800) {
  const sorted = [...projects].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  const years = sorted.map(project => Number(project.date.slice(0, 4)))
  const minYear = years.length ? Math.min(...years) : new Date().getUTCFullYear()
  const maxYear = years.length ? Math.max(...years) : minYear
  const scale = scaleUtc().domain([new Date(Date.UTC(minYear, 0, 1)), new Date(Date.UTC(maxYear + 1, 0, 1))]).range([110, width - 90])
  const categories = [...new Set(sorted.map(project => project.category))].sort((a, b) => a.localeCompare(b, 'en'))
  const nodes: StarNode[] = []
  const bands: { category: string; y: number; height: number; color: string }[] = []
  let top = 70
  for (const category of categories) {
    const ends: number[] = []
    const categoryNodes = sorted.filter(project => project.category === category).map(project => {
      const x = scale(new Date(project.date))
      // Reserve space for permanent names and dates; keep date coordinates exact.
      const labelWidth = Math.max(80, Array.from(project.title).length * 13)
      const labelOnLeft = x + 17 + labelWidth > width - 30
      const left = labelOnLeft ? x - 17 - labelWidth : x - 20
      const right = labelOnLeft ? x + 20 : x + 17 + labelWidth
      let lane = ends.findIndex(end => left - 12 > end)
      if (lane === -1) lane = ends.length
      ends[lane] = right
      return { project, x, y: top + 30 + lane * 38, color: categoryColor(category), radius: project.featured ? 7 : 4, labelX: labelOnLeft ? -17 : 17, labelAnchor: labelOnLeft ? 'end' as const : 'start' as const, labelWidth }
    })
    const height = Math.max(100, ends.length * 38 + 42)
    bands.push({ category, y: top, height, color: categoryColor(category) })
    nodes.push(...categoryNodes)
    top += height
  }
  return { nodes, bands, width, height: Math.max(460, top + 30), minYear, maxYear, ticks: Array.from({ length: maxYear - minYear + 1 }, (_, index) => ({ year: minYear + index, x: scale(new Date(Date.UTC(minYear + index, 0, 1))) })) }
}
