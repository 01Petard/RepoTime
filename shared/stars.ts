import type { Archive, Project, Repository } from './archive'

export const activityLevels = [
  { label: '1 周内', radius: 11, opacity: 1, glow: .8 },
  { label: '1 个月内', radius: 9, opacity: .84, glow: .55 },
  { label: '3 个月内', radius: 7, opacity: .66, glow: .32 },
  { label: '1 年内', radius: 5.5, opacity: .46, glow: .15 },
  { label: '超过 1 年', radius: 4, opacity: .28, glow: .04 },
] as const

// Calendar-month boundaries in UTC, clamped for shorter months (e.g. March 31 -> February 28).
function monthsBefore(date: Date, months: number) {
  const result = new Date(date)
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() - months)
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(date.getUTCDate(), lastDay))
  return result.getTime()
}

export function projectActivity(project: Project, repositories: Map<number, Repository>, syncedAt: string) {
  const members = project.repositoryIds.map(id => repositories.get(id)).filter((repo): repo is Repository => !!repo)
  const dates = members.map(repo => repo.pushedAt ?? repo.createdAt).filter(date => Number.isFinite(Date.parse(date)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))
  const updatedAt = dates[0] ?? null
  const reference = new Date(syncedAt)
  const boundaries = [reference.getTime() - 7 * 86400_000, monthsBefore(reference, 1), monthsBefore(reference, 3), monthsBefore(reference, 12)]
  const index = updatedAt ? boundaries.findIndex(boundary => Date.parse(updatedAt) >= boundary) : -1
  const tier = index === -1 ? 4 : index
  return { ...activityLevels[tier]!, tier, updatedAt, url: members[0]?.url }
}

export function archiveStars(archive: Archive) {
  const repositories = new Map(archive.repositories.map(repo => [repo.id, repo]))
  return new Map(archive.projects.map(project => [project.id, projectActivity(project, repositories, archive.generatedAt)]))
}
