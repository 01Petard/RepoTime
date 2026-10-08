import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { GitHubClient } from '../../scripts/github'
import { syncArchive } from '../../scripts/sync-github'

const user = { id: 1, login: 'owner', name: 'Owner', avatarUrl: 'https://avatars.githubusercontent.com/u/1', url: 'https://github.com/owner', bio: '', createdAt: '2019-01-01T00:00:00Z' }
const rawUser = { id: 1, login: 'owner', name: 'Owner', avatar_url: user.avatarUrl, html_url: user.url, bio: null, created_at: user.createdAt, public_repos: 1 }
function rawRepo(id: number) { return { id, name: `repo-${id}`, full_name: `owner/repo-${id}`, owner: { id: 1 }, private: false, description: null, html_url: `https://github.com/owner/repo-${id}`, homepage: null, created_at: '2026-01-01T00:00:00Z', pushed_at: null, language: null, fork: false, archived: false, stargazers_count: 0 } }
const ok = (value: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(value), { status: 200, headers })

describe('GitHub build client', () => {
  it.each([0, 100, 101, 205])('fully paginates %i repositories', async count => {
    let page = 0
    const request = vi.fn(async () => {
      const start = page++ * 100
      return ok(Array.from({ length: Math.min(100, Math.max(0, count - start)) }, (_, index) => rawRepo(start + index + 1)), start + 100 < count ? { link: `<https://api.github.com/users/owner/repos?page=${page + 1}>; rel="next"` } : {})
    })
    expect(await new GitHubClient(undefined, request).repositories(user)).toHaveLength(count)
    expect(request).toHaveBeenCalledTimes(Math.max(1, Math.ceil(count / 100)))
  })
  it('deduplicates stable IDs and rejects private or other-owner repositories', async () => {
    const request = vi.fn(async () => ok([rawRepo(1), rawRepo(1), { ...rawRepo(2), private: true }, { ...rawRepo(3), owner: { id: 7 } }]))
    expect((await new GitHubClient('secret-token', request).repositories(user)).map(repo => repo.id)).toEqual([1])
  })
  it('retries a transient failure twice, but never retries rate limits', async () => {
    const request = vi.fn().mockRejectedValueOnce(new Error('secret-token')).mockResolvedValueOnce(new Response('', { status: 502 })).mockResolvedValueOnce(ok(rawUser))
    const pause = vi.fn(async () => {})
    expect((await new GitHubClient('secret-token', request, pause).user('owner')).login).toBe('owner')
    expect(request).toHaveBeenCalledTimes(3)
    const limited = vi.fn(async () => new Response('{"message":"rate limit"}', { status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1791446400' } }))
    await expect(new GitHubClient(undefined, limited, pause).user('owner')).rejects.toThrow('限流')
    expect(limited).toHaveBeenCalledTimes(1)
  })
  it('does not disclose credentials in network errors', async () => {
    const request = vi.fn(async () => { throw new Error('Authorization: secret-token') })
    try { await new GitHubClient('secret-token', request, async () => {}).user('owner') } catch (error) { expect(String(error)).not.toContain('secret-token') }
  })
  it('never sends build credentials to external pagination origins', async () => {
    const request = vi.fn(async () => ok([rawRepo(1)], { link: '<https://attacker.invalid/users/owner/repos?page=2>; rel="next"' }))
    await expect(new GitHubClient('secret-token', request).repositories(user)).rejects.toThrow('分页链接')
    expect(request).toHaveBeenCalledTimes(1)
  })
  it('fails a broken second page rather than treating it as complete', async () => {
    const request = vi.fn().mockResolvedValueOnce(ok([rawRepo(1)], { link: '<https://api.github.com/users/owner/repos?page=2>; rel="next"' })).mockResolvedValueOnce(new Response('', { status: 404 }))
    await expect(new GitHubClient(undefined, request).repositories(user)).rejects.toThrow('HTTP 404')
  })
  it('rejects silently truncated pagination against the public repository count', async () => {
    const request = vi.fn().mockResolvedValueOnce(ok({ ...rawUser, public_repos: 101 })).mockResolvedValueOnce(ok(Array.from({ length: 100 }, (_, index) => rawRepo(index + 1))))
    const client = new GitHubClient(undefined, request)
    const profile = await client.user('owner')
    await expect(client.repositories(profile)).rejects.toThrow('数量与分页结果不一致')
  })
  it('fetches three default-branch commits and publishes only display fields', async () => {
    const repo = (await new GitHubClient(undefined, async () => ok([rawRepo(1)])).repositories(user))[0]!
    const request = vi.fn(async (_url: URL | RequestInfo) => ok(Array.from({ length: 4 }, (_, index) => ({
      sha: `sha${index}`, html_url: `https://github.com/owner/repo-1/commit/sha${index}`,
      commit: { message: 'Title\n\nBody', author: { name: 'Deleted author', email: 'private@example.com', date: '2026-01-01T00:00:00Z' }, committer: { name: 'Bot', date: '2026-02-01T00:00:00Z' } }, author: null,
    }))))
    await new GitHubClient(undefined, request).recentCommits(repo)
    expect(String(request.mock.calls[0]![0])).toContain('/commits?per_page=3')
    expect(repo.commits).toHaveLength(3)
    expect(repo.commits[0]).toMatchObject({ author: 'Deleted author', date: '2026-02-01T00:00:00Z', message: 'Title\n\nBody' })
    expect(JSON.stringify(repo.commits)).not.toContain('private@example.com')
  })
  it('handles an empty Git repository but fails other commit errors', async () => {
    const repo = (await new GitHubClient(undefined, async () => ok([rawRepo(1)])).repositories(user))[0]!
    await new GitHubClient(undefined, async () => new Response(JSON.stringify({ message: 'Git Repository is empty.' }), { status: 409 })).recentCommits(repo)
    expect(repo.commits).toEqual([])
    for (const status of [404, 409]) {
      await expect(new GitHubClient(undefined, async () => new Response('{}', { status })).recentCommits(repo)).rejects.toThrow(`HTTP ${status}`)
    }
  })
  it('filters release drafts before publishing', async () => {
    const request = vi.fn().mockResolvedValueOnce(ok({ TypeScript: 500 })).mockResolvedValueOnce(ok([
      { id: 1, name: 'Published', tag_name: 'v1', published_at: '2026-01-01T00:00:00Z', html_url: 'https://github.com/owner/repo-1/releases/tag/v1', draft: false, prerelease: false },
      { id: 2, name: 'Secret draft', tag_name: 'v2', published_at: null, html_url: 'https://github.com/owner/repo-1/releases/tag/v2', draft: true, prerelease: false },
    ]))
    const baseClient = new GitHubClient(undefined, async () => ok([rawRepo(1)]))
    const repo = (await baseClient.repositories(user))[0]!
    await new GitHubClient(undefined, request).enrich(repo)
    expect(repo.languages).toEqual({ TypeScript: 500 })
    expect(repo.releases.map(release => release.title)).toEqual(['Published'])
  })
})

describe('atomic build synchronization', () => {
  it('preserves the complete snapshot on failure and reflects changed configuration on success', async () => {
    const root = await mkdtemp(join(tmpdir(), 'repotime-test-'))
    try {
      await mkdir(join(root, 'config')); await mkdir(join(root, '.generated'))
      const config = { schemaVersion: 1, owner: 'owner', site: { title: 'Original', description: 'Description' } }
      await writeFile(join(root, 'config/repotime.json'), JSON.stringify(config))
      await writeFile(join(root, '.generated/archive.json'), 'old-complete-snapshot')
      const failed = new GitHubClient(undefined, async () => new Response('', { status: 404 }))
      await expect(syncArchive(root, failed)).rejects.toThrow('HTTP 404')
      expect(await readFile(join(root, '.generated/archive.json'), 'utf8')).toBe('old-complete-snapshot')
      const commitFailure = new GitHubClient(undefined, async url => String(url).includes('/commits?')
        ? new Response('', { status: 404 }) : ok(String(url).endsWith('/users/owner') ? rawUser : [rawRepo(1)]))
      await expect(syncArchive(root, commitFailure)).rejects.toThrow('HTTP 404')
      expect(await readFile(join(root, '.generated/archive.json'), 'utf8')).toBe('old-complete-snapshot')
      const fetcher = async (url: URL | RequestInfo) => ok(String(url).endsWith('/users/owner') ? rawUser : String(url).includes('/commits?') ? [] : [rawRepo(1)])
      const client = new GitHubClient(undefined, fetcher)
      await syncArchive(root, client)
      expect(JSON.parse(await readFile(join(root, '.generated/archive.json'), 'utf8')).site.title).toBe('Original')
      await writeFile(join(root, 'config/repotime.json'), JSON.stringify({ ...config, site: { ...config.site, title: 'Updated' }, excludeRepositoryIds: [1] }))
      const updated = await syncArchive(root, client)
      expect(updated.site.title).toBe('Updated'); expect(updated.projects).toEqual([])
    } finally { await rm(root, { recursive: true, force: true }) }
  })
})
