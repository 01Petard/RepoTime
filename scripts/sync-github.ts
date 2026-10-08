import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { configSchema, buildArchive, type Archive } from '../shared/archive'
import { GitHubClient } from './github'

export async function syncArchive(root: string, client = new GitHubClient(process.env.GITHUB_TOKEN)): Promise<Archive> {
  const config = configSchema.parse(JSON.parse(await readFile(resolve(root, 'config/repotime.json'), 'utf8')))
  for (const project of config.projects) {
    if (project.cover) await access(resolve(root, `public${project.cover}`))
  }
  const user = await client.user(config.owner)
  const repositories = await client.repositories(user)
  // Validate every grouping before spending requests on optional detail enrichment.
  buildArchive(config, user, repositories, new Date().toISOString())
  const featuredIds = new Set(config.projects.filter(project => project.featured).flatMap(project => project.repositoryIds))
  for (const repo of repositories) {
    if (config.excludeRepositoryIds.includes(repo.id)) continue
    await client.recentCommits(repo)
    if (featuredIds.has(repo.id)) await client.enrich(repo)
  }
  const archive = buildArchive(config, user, repositories, new Date().toISOString())
  await mkdir(resolve(root, '.generated'), { recursive: true })
  const temporary = resolve(root, '.generated/archive.json.tmp')
  // Failed requests never replace the last complete local snapshot.
  await writeFile(temporary, `${JSON.stringify(archive, null, 2)}\n`, 'utf8')
  await rename(temporary, resolve(root, '.generated/archive.json'))
  return archive
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    try { process.loadEnvFile('.env') } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    const archive = await syncArchive(process.cwd())
    console.log(`同步完成：${archive.user.login}，${archive.repositories.length} 个公开仓库，${archive.projects.length} 个项目，${archive.generatedAt}。`)
  } catch (error) {
    // Zod errors can include raw input; only emit paths and validation messages.
    if (error && typeof error === 'object' && 'issues' in error) {
      console.error('配置或 GitHub 数据校验失败，请检查字段格式。')
      const issues = (error as { issues: { path: PropertyKey[]; message: string }[] }).issues
      for (const issue of issues) console.error(`${issue.path.join('.')}: ${issue.message}`)
    } else console.error(error instanceof Error && error.message.startsWith('GitHub') || error instanceof Error && error.message.startsWith('项目 ') ? error.message : '同步失败，请检查配置文件、封面资源和网络连接。')
    process.exitCode = 1
  }
}
