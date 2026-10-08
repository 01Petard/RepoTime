import { readdir, readFile, stat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import type { Archive } from '../shared/archive'

const root = process.cwd()
const archive: Archive = JSON.parse(await readFile(resolve(root, '.generated/archive.json'), 'utf8'))
const publicDirectory = resolve(root, '.output/public')
const routes = ['/', `/u/${archive.user.login}`, `/u/${archive.user.login}/timeline`, ...archive.projects.map(project => `/u/${archive.user.login}/projects/${project.id}`), ...Object.keys(archive.aliases).map(id => `/u/${archive.user.login}/projects/${id}`)]
for (const route of routes) {
  const html = await readFile(join(publicDirectory, route, 'index.html'), 'utf8')
  if (!html.includes('property="og:title"') || !html.includes(archive.user.login)) throw new Error(`静态页面缺少正文或分享元数据：${route}`)
}
let checked = 0
async function inspect(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) { await inspect(path); continue }
    if (!/\.(html|json|js|mjs)$/.test(entry.name)) continue
    const content = await readFile(path, 'utf8')
    if (content.includes('api.github.com') || /gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/.test(content) || (process.env.GITHUB_TOKEN && content.includes(process.env.GITHUB_TOKEN))) throw new Error('静态产物包含 GitHub API 请求代码或凭据，请检查构建边界。')
    checked++
  }
}
await inspect(publicDirectory)
try { await stat(resolve(root, '.vercel/output/functions')); throw new Error('检测到 Vercel Functions，预期仅部署静态产物。') } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
console.log(`验证通过：${routes.length} 个静态路由；检查 ${checked} 个文件；无 GitHub API 客户端代码、凭据或 Vercel Functions。`)
