import { z } from 'zod'

const httpUrl = z.string().url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol), '链接必须使用 HTTP 或 HTTPS')
const projectId = z.string().regex(/^[a-z0-9][a-z0-9-]*$/).refine(value => !value.startsWith('repo-'), 'repo- 前缀保留给自动项目')
const milestoneSchema = z.object({ date: z.iso.date(), title: z.string().min(1), sourceUrl: httpUrl.optional() }).strict()

export const configSchema = z.object({
  schemaVersion: z.literal(1),
  owner: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/),
  site: z.object({
    title: z.string().min(1), description: z.string().min(1),
    brand: z.string().trim().min(1).optional(),
    headline: z.string().min(1).default('每一行代码，\n都有来处。'),
    intro: z.string().default('沿着时间，探索那些持续生长的想法。'),
    siteUrl: httpUrl.optional(),
  }).strict(),
  excludeRepositoryIds: z.array(z.number().int().positive()).default([]),
  projects: z.array(z.object({
    id: projectId, title: z.string().min(1), repositoryIds: z.array(z.number().int().positive()).min(1),
    description: z.string().optional(),
    featured: z.boolean().default(false),
    cover: z.string().regex(/^\/covers\/[a-zA-Z0-9_-]+\.(svg|png|webp|jpg)$/).optional(),
    technologies: z.array(z.string().min(1)).default([]), why: z.string().optional(),
    startedAt: z.iso.date().optional(), links: z.array(z.object({ label: z.string().min(1), url: httpUrl }).strict()).default([]),
    milestones: z.array(milestoneSchema).default([]),
  }).strict()).default([]),
  relations: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().min(1) }).strict()).default([]),
}).strict().superRefine((config, ctx) => {
  const projectIds = new Set<string>()
  const repositories = new Set<number>()
  for (const [index, project] of config.projects.entries()) {
    if (projectIds.has(project.id)) ctx.addIssue({ code: 'custom', message: '项目 ID 重复', path: ['projects', index, 'id'] })
    projectIds.add(project.id)
    for (const id of project.repositoryIds) {
      if (repositories.has(id)) ctx.addIssue({ code: 'custom', message: `仓库 ${id} 重复归属`, path: ['projects', index, 'repositoryIds'] })
      if (config.excludeRepositoryIds.includes(id)) ctx.addIssue({ code: 'custom', message: `仓库 ${id} 同时被排除和收录`, path: ['projects', index, 'repositoryIds'] })
      repositories.add(id)
    }
  }
  for (const [index, relation] of config.relations.entries()) {
    if (!projectIds.has(relation.from) || !projectIds.has(relation.to) || relation.from === relation.to)
      ctx.addIssue({ code: 'custom', message: '项目关联必须指向两个有效且不同的整理项目', path: ['relations', index] })
  }
})

export type SiteConfig = z.infer<typeof configSchema>
export interface GitHubUser { id: number; login: string; name: string; avatarUrl: string; url: string; bio: string; createdAt: string }
export interface Release { id: number; title: string; tag: string; date: string; url: string; prerelease: boolean }
export interface Commit { sha: string; message: string; date: string; author: string; url: string }
export interface Repository {
  id: number; name: string; fullName: string; description: string; url: string; homepage: string | null
  createdAt: string; pushedAt: string | null; language: string | null; fork: boolean; archived: boolean; stars: number
  languages: Record<string, number>; releases: Release[]; commits: Commit[]
}
export interface Milestone { id: string; date: string; title: string; source: 'github' | 'personal'; sourceUrl?: string }
export interface Project {
  id: string; title: string; description: string; repositoryIds: number[]; category: string; categorySource: 'language'
  date: string; dateSource: 'github' | 'personal'; featured: boolean; fork: boolean; archived: boolean; stars: number
  cover?: string; technologies: string[]; why?: string; links: { label: string; url: string }[]; milestones: Milestone[]
}
export interface Archive {
  schemaVersion: 1; generatedAt: string; site: SiteConfig['site']; user: GitHubUser; repositories: Repository[]
  projects: Project[]; aliases: Record<string, string>; relations: SiteConfig['relations']
}

export function buildArchive(config: SiteConfig, user: GitHubUser, input: Repository[], generatedAt: string): Archive {
  const repositories = [...new Map(input.filter(repo => !config.excludeRepositoryIds.includes(repo.id)).map(repo => [repo.id, repo])).values()]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id)
  const byId = new Map(repositories.map(repo => [repo.id, repo]))
  const grouped = new Set<number>()
  const aliases: Record<string, string> = {}
  const projects: Project[] = []
  for (const curated of config.projects) {
    const members = curated.repositoryIds.map(id => {
      const repo = byId.get(id)
      if (!repo) throw new Error(`项目 ${curated.id} 的仓库 ${id} 不在 ${user.login} 的公开仓库中，请检查配置。`)
      grouped.add(id)
      aliases[`repo-${id}`] = curated.id
      return repo
    })
    const earliest = members.map(repo => repo.createdAt).sort()[0]!
    const language = members.find(repo => repo.language)?.language ?? '未分类'
    const technologies = [...new Set([...curated.technologies, ...members.flatMap(repo => [repo.language, ...Object.keys(repo.languages)]).filter((value): value is string => !!value)])]
    projects.push({
      id: curated.id, title: curated.title, description: curated.description ?? [...new Set(members.map(repo => repo.description).filter(Boolean))].join(' · '),
      repositoryIds: curated.repositoryIds, category: language, categorySource: 'language',
      date: curated.startedAt ? `${curated.startedAt}T00:00:00.000Z` : earliest,
      dateSource: curated.startedAt ? 'personal' : 'github', featured: curated.featured,
      fork: members.every(repo => repo.fork), archived: members.every(repo => repo.archived),
      stars: members.reduce((total, repo) => total + repo.stars, 0), cover: curated.cover, technologies,
      why: curated.why, links: curated.links,
      milestones: [
        ...curated.milestones.map((item, index) => ({ ...item, id: `personal-${curated.id}-${index}`, date: `${item.date}T00:00:00.000Z`, source: 'personal' as const })),
        ...members.flatMap(repo => repo.releases.map(release => ({ id: `release-${release.id}`, date: release.date, title: `${repo.name} · ${release.title}`, source: 'github' as const, sourceUrl: release.url }))),
      ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)),
    })
  }
  for (const repo of repositories) {
    if (grouped.has(repo.id)) continue
    projects.push({
      id: `repo-${repo.id}`, title: repo.name, description: repo.description, repositoryIds: [repo.id],
      category: repo.language ?? '未分类', categorySource: 'language', date: repo.createdAt, dateSource: 'github',
      featured: false, fork: repo.fork, archived: repo.archived, stars: repo.stars,
      technologies: repo.language ? [repo.language] : [], links: [], milestones: [],
    })
  }
  projects.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  return { schemaVersion: 1, generatedAt, site: config.site, user, repositories, projects, aliases, relations: config.relations }
}

export function projectPath(archive: Archive, id: string): string {
  return `/u/${archive.user.login}/projects/${id}`
}
export function dateLabel(date: string): string { return date.slice(0, 10) }
export function projectYear(project: Project): number { return Number(project.date.slice(0, 4)) }
export function timelineEvents(projects: Project[]) {
  return projects.flatMap(project => [
    { id: `project-${project.id}`, project, date: project.date, title: project.title, kind: 'project' as const, source: project.dateSource },
    ...project.milestones.map(milestone => ({ id: milestone.id, project, date: milestone.date, title: milestone.title, kind: 'milestone' as const, source: milestone.source })),
  ]).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
}
export const palette = ['#75cfff', '#c7a0ff', '#65ebbc', '#ffd477', '#ff91b8', '#ffac86', '#d6ec82']
export function categoryColor(category: string): string {
  let hash = 0
  for (const character of category) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0
  return palette[hash % palette.length]!
}

export function recentProjectCommits(repositories: Repository[]) {
  return repositories.flatMap(repo => [...new Map((repo.commits ?? []).map(commit => [commit.sha, commit])).values()]
    .map(commit => ({ ...commit, repositoryId: repo.id, repositoryName: repo.fullName })))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.repositoryId - b.repositoryId || a.sha.localeCompare(b.sha))
    .slice(0, 3)
}
