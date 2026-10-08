import { describe, expect, it } from 'vitest'
import { buildArchive, configSchema, timelineEvents, recentProjectCommits, type GitHubUser, type Repository } from '../../shared/archive'
import { layoutUniverse } from '../../shared/layout'

export const user: GitHubUser = { id: 1, login: 'owner', name: 'Owner', avatarUrl: 'https://avatars.githubusercontent.com/u/1', url: 'https://github.com/owner', bio: '', createdAt: '2019-01-01T00:00:00Z' }
export function repo(id: number, date = '2026-01-01T00:00:00Z'): Repository { return { id, name: `repo-${id}`, fullName: `owner/repo-${id}`, description: '', url: `https://github.com/owner/repo-${id}`, homepage: null, createdAt: date, pushedAt: null, language: null, fork: false, archived: false, stars: 0, languages: {}, releases: [], commits: [] } }
const base = { schemaVersion: 1, owner: 'owner', site: { title: 'Archive', description: 'Description' } }

describe('curation contract', () => {
  it('merges by stable IDs, uses earliest date, and preserves repo aliases after rename', () => {
    const config = configSchema.parse({ ...base, projects: [{ id: 'app', title: 'App', repositoryIds: [1, 2] }] })
    const first = repo(1, '2020-01-01T00:00:00Z'); first.name = 'renamed'; first.fork = true
    const archive = buildArchive(config, user, [repo(2), first, repo(3), first], '2026-01-01T00:00:00Z')
    expect(archive.repositories).toHaveLength(3)
    expect(archive.projects.map(project => project.id)).toEqual(['app', 'repo-3'])
    expect(archive.projects[0]).toMatchObject({ date: first.createdAt, dateSource: 'github', fork: false, category: '未分类' })
    expect(archive.aliases['repo-1']).toBe('app')
  })
  it('marks explicit dates and milestones as personal records and honors exclusions', () => {
    const config = configSchema.parse({ ...base, excludeRepositoryIds: [3], projects: [{ id: 'app', title: 'App', repositoryIds: [1], startedAt: '2018-12-31', milestones: [{ date: '2019-01-01', title: '个人记录' }] }] })
    const archive = buildArchive(config, user, [repo(3), repo(1)], '2026-01-01T00:00:00Z')
    expect(archive.projects).toHaveLength(1)
    expect(archive.projects[0]).toMatchObject({ dateSource: 'personal', categorySource: 'language', date: '2018-12-31T00:00:00.000Z' })
    expect(archive.projects[0]!.milestones[0]!.source).toBe('personal')
  })
  it.each([
    { owner: '' },
    { projects: [{ id: 'a', title: 'A', repositoryIds: [1], category: '人工领域' }] },
    { projects: [{ id: 'a', title: 'A', repositoryIds: [1] }, { id: 'a', title: 'B', repositoryIds: [2] }] },
    { projects: [{ id: 'a', title: 'A', repositoryIds: [1] }, { id: 'b', title: 'B', repositoryIds: [1] }] },
    { projects: [{ id: 'a', title: 'A', repositoryIds: [1], startedAt: '2026-02-30' }] },
    { relations: [{ from: 'a', to: 'missing', label: 'relation' }] },
    { projects: [{ id: 'a', title: 'A', repositoryIds: [1], links: [{ label: 'bad', url: 'javascript:alert(1)' }] }] },
  ])('rejects ambiguous or unsafe config: %j', extra => expect(configSchema.safeParse({ ...base, ...extra }).success).toBe(false))
  it('does not create fake projects for invalid repository IDs', () => {
    const config = configSchema.parse({ ...base, projects: [{ id: 'missing', title: 'Missing', repositoryIds: [404] }] })
    expect(() => buildArchive(config, user, [], '')).toThrow('不在')
  })
  it('accepts a legitimately empty account', () => expect(buildArchive(configSchema.parse(base), user, [], '').projects).toEqual([]))
  it('classifies all projects by repository language and merged projects by configured repository order', () => {
    const repositories = [repo(1), { ...repo(2), language: 'Vue' }, { ...repo(3), language: 'Java' }]
    const config = configSchema.parse({ ...base, projects: [{ id: 'app', title: 'App', repositoryIds: [1, 2] }] })
    const archive = buildArchive(config, user, repositories, '')
    expect(archive.projects.find(project => project.id === 'app')).toMatchObject({ category: 'Vue', categorySource: 'language' })
    expect(archive.projects.find(project => project.id === 'repo-3')).toMatchObject({ category: 'Java', categorySource: 'language' })
    const merged = buildArchive(configSchema.parse({ ...base, projects: [{ id: 'app', title: 'App', repositoryIds: [3, 2] }] }), user, repositories, '')
    expect(merged.projects.find(project => project.id === 'app')!.category).toBe('Java')
    expect(merged.projects.find(project => project.id === 'repo-1')!.category).toBe('未分类')
  })
  it('places releases and personal records on their own dates, independent of project creation', () => {
    const config = configSchema.parse({ ...base, projects: [{ id: 'app', title: 'App', repositoryIds: [1], milestones: [{ date: '2025-12-31', title: 'A personal update' }] }] })
    const repository = repo(1, '2019-01-01T00:00:00Z')
    repository.releases = [{ id: 17, title: 'v1', tag: 'v1', date: '2026-08-01T00:00:00Z', url: 'https://github.com/owner/app/releases/v1', prerelease: false }]
    const events = timelineEvents(buildArchive(config, user, [repository], '').projects)
    expect(events.map(event => [event.date.slice(0, 4), event.kind, event.source])).toEqual([['2026', 'milestone', 'github'], ['2025', 'milestone', 'personal'], ['2019', 'project', 'github']])
  })
})

describe('universe coordinates', () => {
  const projects = buildArchive(configSchema.parse(base), user, Array.from({ length: 40 }, (_, index) => repo(index + 1)), '').projects
  it('scatters equal dates and remains deterministic regardless of input order', () => {
    const layout = layoutUniverse(projects)
    expect(layoutUniverse([...projects].reverse())).toEqual(layout)
    expect(new Set(layout.nodes.map(node => node.x)).size).toBe(projects.length)
    expect(new Set(layout.nodes.map(node => node.y)).size).toBe(projects.length)
    expect(layoutUniverse(projects.map(project => ({ ...project, date: '2030-01-01T00:00:00Z' }))).nodes.map(({ x, y }) => [x, y]))
      .toEqual(layout.nodes.map(({ x, y }) => [x, y]))
  })
  it('handles empty and single-project archives', () => {
    expect(layoutUniverse([]).nodes).toEqual([])
    expect(layoutUniverse([]).links).toEqual([])
    const layout = layoutUniverse(projects.slice(0, 1))
    expect(layout.nodes).toHaveLength(1)
    expect(layout.links).toEqual([])
    expect(Number.isFinite(layout.nodes[0]!.x)).toBe(true)
  })
  it('keeps stars and permanent labels apart and inside the map', () => {
    const repositories = Array.from({ length: 84 }, (_, index) => ({ ...repo(index + 1), name: `A long project name ${index + 1}` }))
    const layout = layoutUniverse(buildArchive(configSchema.parse(base), user, repositories, '').projects, 1400)
    for (const [index, node] of layout.nodes.entries()) {
      expect(node.x - node.labelWidth / 2).toBeGreaterThanOrEqual(0)
      expect(node.x + node.labelWidth / 2).toBeLessThanOrEqual(layout.width)
      expect(node.y).toBeGreaterThan(30)
      expect(node.y + 50).toBeLessThan(layout.height)
      for (const other of layout.nodes.slice(index + 1)) {
        expect(Math.abs(node.x - other.x) > (node.labelWidth + other.labelWidth) / 2 + 18 || Math.abs(node.y - other.y) > 88).toBe(true)
      }
    }
  })
  it('fills a landscape rectangle, including its corners', () => {
    const layout = layoutUniverse(buildArchive(configSchema.parse(base), user, Array.from({ length: 84 }, (_, index) => repo(index + 1)), '').projects, 1400)
    expect(layout.width / layout.height).toBeCloseTo(16 / 9)
    for (const right of [false, true]) for (const bottom of [false, true]) {
      expect(layout.nodes.some(node => (right ? node.x > layout.width * .75 : node.x < layout.width * .25)
        && (bottom ? node.y > layout.height * .75 : node.y < layout.height * .25))).toBe(true)
    }
  })
  it('connects nearby projects with the same known language, without duplicate edges', () => {
    const layout = layoutUniverse(projects.map((project, index) => ({ ...project, category: index === 0 ? '未分类' : 'Java' })))
    expect(layout.links.length).toBeGreaterThan(0)
    const keys = layout.links.map(link => [link.from.project.id, link.to.project.id].sort().join(':'))
    expect(new Set(keys).size).toBe(keys.length)
    for (const link of layout.links) {
      expect(link.from.project.category).toBe('Java')
      expect(link.to.project.category).toBe('Java')
      expect(link.from.project.id).not.toBe(link.to.project.id)
      expect(link.label).toBe('相近技术项目')
    }
  })
})

it('merges recent commits across repositories with stable ordering, deduplication and a three-item limit', () => {
  const first = repo(1), second = repo(2)
  const commit = (sha: string, day: number) => ({ sha, message: 'Change', author: 'Owner', date: `2026-01-0${day}T00:00:00Z`, url: `https://github.com/owner/repo/commit/${sha}` })
  first.commits = [commit('old', 1), commit('new', 5), commit('new', 5)]
  second.commits = [commit('middle', 3), commit('latest', 6), commit('older', 2)]
  expect(recentProjectCommits([first, second]).map(item => [item.sha, item.repositoryId])).toEqual([['latest', 2], ['new', 1], ['middle', 2]])
  expect(recentProjectCommits([second, first])).toEqual(recentProjectCommits([first, second]))
  expect(recentProjectCommits([repo(3)])).toEqual([])
})
