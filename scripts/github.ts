import { z } from 'zod'
import type { GitHubUser, Repository } from '../shared/archive'

const userSchema = z.object({ id: z.number().int(), login: z.string(), name: z.string().nullable(), avatar_url: z.string().url(), html_url: z.string().url(), bio: z.string().nullable(), created_at: z.iso.datetime(), public_repos: z.number().int().nonnegative() })
const repositorySchema = z.object({
  id: z.number().int(), name: z.string(), full_name: z.string(), owner: z.object({ id: z.number().int() }),
  private: z.boolean(), description: z.string().nullable(), html_url: z.string().url(), homepage: z.string().nullable(),
  created_at: z.iso.datetime(), pushed_at: z.iso.datetime().nullable(), language: z.string().nullable(),
  fork: z.boolean(), archived: z.boolean(), stargazers_count: z.number().int().nonnegative(),
})
const releasesSchema = z.array(z.object({ id: z.number().int(), name: z.string().nullable(), tag_name: z.string(), published_at: z.iso.datetime().nullable(), html_url: z.string().url(), draft: z.boolean(), prerelease: z.boolean() }))

const commitIdentitySchema = z.object({ name: z.string(), date: z.iso.datetime() }).nullable()
const commitsSchema = z.array(z.object({
  sha: z.string().min(1), html_url: z.string().url(),
  commit: z.object({ message: z.string(), author: commitIdentitySchema, committer: commitIdentitySchema }),
  author: z.object({ login: z.string() }).nullable(),
}))

export class GitHubClient {
  private readonly repositoryCounts = new Map<number, number>()
  constructor(private readonly token?: string, private readonly request: typeof fetch = fetch, private readonly pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))) {}

  async get(path: string, allowEmptyRepository = false): Promise<{ data: unknown; next: string | null }> {
    const url = new URL(path, 'https://api.github.com')
    if (url.origin !== 'https://api.github.com' || url.username || url.password) throw new Error('GitHub 分页链接无效。')
    for (let attempt = 0; attempt < 3; attempt++) {
      let response: Response
      try {
        response = await this.request(url, {
          headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10', ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) },
          signal: AbortSignal.timeout(20_000), redirect: 'error',
        })
      } catch {
        if (attempt === 2) throw new Error(`GitHub 网络请求失败：${url.pathname}。请检查网络后重新部署。`)
        await this.pause(500 * 2 ** attempt)
        continue
      }
      if (response.status === 403 || response.status === 429) {
        const remaining = response.headers.get('x-ratelimit-remaining')
        const retryAfter = response.headers.get('retry-after')
        const message = await response.text()
        if (remaining === '0' || retryAfter || response.status === 429 || message.toLowerCase().includes('rate limit')) {
          const reset = Number(response.headers.get('x-ratelimit-reset'))
          const time = retryAfter ? `等待 ${retryAfter} 秒` : reset > 0 ? `等待至 ${new Date(reset * 1000).toISOString()}` : '至少等待 60 秒'
          throw new Error(`GitHub API 已限流，请${time}后重新部署；可配置构建专用 GITHUB_TOKEN。`)
        }
      }
      if (response.status >= 500 && attempt < 2) { await this.pause(500 * 2 ** attempt); continue }
      if (allowEmptyRepository && response.status === 409) {
        const body = await response.json().catch(() => null)
        if (body?.message === 'Git Repository is empty.') return { data: [], next: null }
      }
      if (!response.ok) throw new Error(`GitHub 请求失败（HTTP ${response.status}）：${url.pathname}。请检查账号、公开仓库或构建凭据。`)
      let data: unknown
      try { data = await response.json() } catch { throw new Error(`GitHub 返回了无效 JSON：${url.pathname}。`) }
      return { data, next: response.headers.get('link')?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null }
    }
    throw new Error('GitHub 同步失败。')
  }

  async user(owner: string): Promise<GitHubUser> {
    const { data } = await this.get(`/users/${encodeURIComponent(owner)}`)
    const user = userSchema.parse(data)
    this.repositoryCounts.set(user.id, user.public_repos)
    return { id: user.id, login: user.login, name: user.name ?? user.login, avatarUrl: user.avatar_url, url: user.html_url, bio: user.bio ?? '', createdAt: user.created_at }
  }

  async repositories(user: GitHubUser): Promise<Repository[]> {
    const result = new Map<number, Repository>()
    const visited = new Set<string>()
    let next: string | null = `/users/${encodeURIComponent(user.login)}/repos?type=owner&per_page=100&sort=created&direction=asc`
    while (next) {
      const normalized = new URL(next, 'https://api.github.com')
      if (normalized.pathname !== `/users/${user.login}/repos` || visited.has(normalized.href)) throw new Error('GitHub 分页链无效，未生成快照。')
      visited.add(normalized.href)
      const page = await this.get(next)
      for (const repo of z.array(repositorySchema).parse(page.data)) {
        if (repo.private || repo.owner.id !== user.id) continue
        const homepage = repo.homepage && /^https?:\/\//.test(repo.homepage) ? repo.homepage : null
        result.set(repo.id, { id: repo.id, name: repo.name, fullName: repo.full_name, description: repo.description ?? '', url: repo.html_url,
          homepage, createdAt: repo.created_at, pushedAt: repo.pushed_at, language: repo.language, fork: repo.fork, archived: repo.archived,
          stars: repo.stargazers_count, languages: {}, releases: [], commits: [] })
      }
      next = page.next
    }
    const expected = this.repositoryCounts.get(user.id)
    if (expected !== undefined && result.size !== expected) throw new Error('GitHub 公开仓库数量与分页结果不一致，可能遗漏分页或同步期间仓库发生变化；请重新部署。')
    return [...result.values()]
  }

  async recentCommits(repo: Repository): Promise<void> {
    const path = `/repos/${repo.fullName.split('/').map(encodeURIComponent).join('/')}/commits?per_page=3`
    const response = await this.get(path, true)
    repo.commits = commitsSchema.parse(response.data).slice(0, 3).map(item => {
      const date = item.commit.committer?.date ?? item.commit.author?.date
      if (!date) throw new Error(`GitHub 提交日期缺失：${repo.fullName}。`)
      return { sha: item.sha, message: item.commit.message, date,
        author: item.commit.author?.name || item.author?.login || '未知作者', url: item.html_url }
    })
  }

  async enrich(repo: Repository): Promise<void> {
    const path = `/repos/${repo.fullName.split('/').map(encodeURIComponent).join('/')}`
    const languageResponse = await this.get(`${path}/languages`)
    repo.languages = z.record(z.string(), z.number().nonnegative()).parse(languageResponse.data)
    const releaseResponse = await this.get(`${path}/releases?per_page=10`)
    repo.releases = releasesSchema.parse(releaseResponse.data).filter(release => !release.draft && !!release.published_at)
      .map(release => ({ id: release.id, title: release.name || release.tag_name, tag: release.tag_name, date: release.published_at!, url: release.html_url, prerelease: release.prerelease }))
  }
}
