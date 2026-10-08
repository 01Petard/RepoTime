import { describe, expect, it } from 'vitest'
import { activityLevels, universeActivityLevels, projectActivity } from '../../shared/stars'
import { buildArchive, configSchema } from '../../shared/archive'
import type { GitHubUser, Repository } from '../../shared/archive'
const user: GitHubUser = { id: 1, login: 'owner', name: 'Owner', avatarUrl: 'https://github.com/avatar.png', url: 'https://github.com/owner', bio: '', createdAt: '2019-01-01T00:00:00Z' }
function repo(id: number, date = '2026-01-01T00:00:00Z'): Repository {
  return { id, name: `repo-${id}`, fullName: `owner/repo-${id}`, description: '', url: `https://github.com/owner/repo-${id}`, homepage: null, createdAt: date, pushedAt: null, language: null, fork: false, archived: false, stars: 0, languages: {}, releases: [], commits: [] }
}

const config = configSchema.parse({ schemaVersion: 1, owner: 'owner', site: { title: 'Archive', description: 'Description' }, projects: [{ id: 'app', title: 'App', repositoryIds: [1, 2] }] })
const reference = '2026-10-08T12:00:00Z'
const project = buildArchive(config, user, [repo(1), repo(2)], reference).projects[0]!
function activity(date: string | null, at = reference) { return projectActivity(project, new Map([[1, { ...repo(1, '2020-01-01T00:00:00Z'), pushedAt: date }]]), at) }

describe('five update brightness levels', () => {
  it.each([
    ['2026-10-08T12:00:00Z', 0], ['2026-10-01T12:00:00Z', 0], ['2026-10-01T11:59:59Z', 1],
    ['2026-09-08T12:00:00Z', 1], ['2026-09-08T11:59:59Z', 2],
    ['2026-07-08T12:00:00Z', 2], ['2026-07-08T11:59:59Z', 3],
    ['2025-10-08T12:00:00Z', 3], ['2025-10-08T11:59:59Z', 4],
  ] as const)('assigns %s to level %i with inclusive boundaries', (date, tier) => expect(activity(date).tier).toBe(tier))
  it('uses calendar months and clamps month ends', () => {
    expect(activity('2026-02-28T12:00:00Z', '2026-03-31T12:00:00Z').tier).toBe(1)
    expect(activity('2026-02-28T11:59:59Z', '2026-03-31T12:00:00Z').tier).toBe(2)
    expect(activity('2024-02-29T12:00:00Z', '2025-02-28T12:00:00Z').tier).toBe(3)
  })
  it('uses the most recently pushed member and the first configured repository URL', () => {
    const result = projectActivity(project, new Map([[2, { ...repo(2), pushedAt: reference }], [1, repo(1, '2020-01-01T00:00:00Z')]]), reference)
    expect(result).toMatchObject({ tier: 0, updatedAt: reference, url: repo(1).url })
    expect(activity(null)).toMatchObject({ tier: 4, updatedAt: '2020-01-01T00:00:00Z' })
    expect(projectActivity(project, new Map(), reference)).toMatchObject({ tier: 4, updatedAt: null, url: undefined })
    expect(activity(reference)).toEqual(activity(reference))
  })
  it('strictly decreases size, brightness and glow between levels', () => {
    for (let index = 1; index < activityLevels.length; index++) {
      for (const key of ['radius', 'opacity', 'glow'] as const) expect(activityLevels[index]![key]).toBeLessThan(activityLevels[index - 1]![key])
    }
  })
})

it('amplifies the five graph tiers without changing activity labels or homepage stars', () => {
  expect(universeActivityLevels.map(level => level.label)).toEqual(activityLevels.map(level => level.label))
  expect(universeActivityLevels[0]!.radius / universeActivityLevels[4]!.radius).toBeGreaterThan(8)
  for (let index = 1; index < universeActivityLevels.length; index++) {
    for (const key of ['radius', 'opacity', 'glow'] as const) expect(universeActivityLevels[index]![key]).toBeLessThan(universeActivityLevels[index - 1]![key])
  }
})
