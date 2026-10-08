import { categoryColor, type Project } from './archive'

export interface StarNode { project: Project; x: number; y: number; color: string; labelWidth: number }
export interface StarLink { from: StarNode; to: StarNode; label: string }

export function layoutUniverse(projects: Project[], width = 1800) {
  // IDs seed the scatter so reloads and filters retain a project's coordinates.
  const sorted = [...projects].sort((a, b) => a.id.localeCompare(b.id))
  let seed = 2166136261
  for (const project of sorted) for (const char of project.id) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  width = Math.max(width, Math.sqrt(sorted.length) * 220)
  let height = width * 9 / 16
  const nodes: StarNode[] = []
  for (const project of sorted) {
    const labelWidth = Math.max(60, Array.from(project.title).reduce((sum, char) => sum + (char.charCodeAt(0) > 255 ? 20 : 11), 0))
    let x = width / 2, y = height / 2
    let placed = false
    for (let attempt = 0; !placed; attempt++) {
      // Expand dense archives instead of allowing names or stars to overlap.
      if (attempt > 0 && attempt % 1500 === 0) {
        const factor = (height + 140) / height
        height += 140
        width *= factor
        for (const node of nodes) { node.x *= factor; node.y *= factor }
      }
      x = labelWidth / 2 + 50 + random() * Math.max(0, width - labelWidth - 100)
      y = 70 + random() * (height - 140)
      placed = nodes.every(node => Math.abs(node.x - x) > (node.labelWidth + labelWidth) / 2 + 18 || Math.abs(node.y - y) > 88)
    }
    nodes.push({ project, x, y, color: categoryColor(project.category), labelWidth })
  }
  const links: StarLink[] = []
  const linked = new Set<string>()
  for (const node of nodes) {
    if (node.project.category === '未分类') continue
    const neighbors = nodes.filter(other => other !== node && other.project.category === node.project.category)
      .sort((a, b) => Math.hypot(a.x - node.x, a.y - node.y) - Math.hypot(b.x - node.x, b.y - node.y)).slice(0, 2)
    for (const neighbor of neighbors) {
      const key = [node.project.id, neighbor.project.id].sort().join(':')
      if (linked.has(key)) continue
      linked.add(key)
      links.push({ from: node, to: neighbor, label: '相近技术项目' })
    }
  }
  return { nodes, links, width, height }
}
