import { expect, test } from '@playwright/test'
import { archiveStars } from '../../shared/stars'
import type { Archive } from '../../shared/archive'
import snapshot from '../../.generated/archive.json' with { type: 'json' }
const owner = snapshot.user.login
const base = `/u/${owner}`
const project = snapshot.projects.find(project => project.featured) ?? snapshot.projects[0]

test('published archive is read-only and performs no GitHub API or mutation requests', async ({ page }) => {
  const forbidden: string[] = []
  const errors: string[] = []
  page.on('request', request => { if (new URL(request.url()).hostname === 'api.github.com' || !['GET', 'HEAD'].includes(request.method())) forbidden.push(request.url()) })
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(snapshot.site.headline.split('\n')[0]!)
  await page.getByRole('link', { name: '探索开发宇宙', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('开发宇宙')
  await page.getByLabel('搜索项目').fill('no-such-project-___')
  await expect(page.locator('.empty-state:visible, .map-empty:visible').first()).toBeVisible()
  await page.getByLabel('搜索项目').fill('')
  await page.getByRole('link', { name: '切换时间长河' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('时间长河')
  expect(forbidden).toEqual([])
  expect(errors).toEqual([])
  expect(await page.locator('body').evaluate(element => element.scrollWidth <= window.innerWidth)).toBe(true)
})

test('project detail and merged repository aliases are directly accessible', async ({ page, request }) => {
  test.skip(!project, 'Empty account has no projects')
  const url = `${base}/projects/${project!.id}`
  const response = await request.get(url)
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain(`property="og:title"`)
  expect(html).toContain(project!.title)
  await page.goto(url)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(project!.title)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(project!.title)
  const alias = Object.entries(snapshot.aliases).find(([, id]) => id === project!.id)
  if (alias) { await page.goto(`${base}/projects/${alias[0]}`); await expect(page.getByRole('heading', { level: 1 })).toHaveText(project!.title) }
  expect(await page.locator('body').evaluate(element => element.scrollWidth <= window.innerWidth)).toBe(true)
})

test('filters persist in URLs and the timeline can expand months', async ({ page }) => {
  await page.goto(`${base}/timeline?forks=1&archived=0`)
  await expect(page.getByRole('checkbox', { name: '显示 Fork 项目' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: '显示已归档项目' })).not.toBeChecked()
  await page.getByRole('button', { name: '展开月份' }).first().click()
  await expect(page.getByRole('button', { name: '收起月份' }).first()).toBeVisible()
  await page.getByRole('link', { name: '回到开发宇宙' }).click()
  expect(new URL(page.url()).searchParams.get('forks')).toBe('1')
  expect(new URL(page.url()).searchParams.get('archived')).toBe('0')
  await page.reload()
  await expect(page.getByRole('checkbox', { name: '显示 Fork 项目' })).toBeChecked()
})

test('desktop nodes support keyboard selection, direct repository links, zoom, reset and fullscreen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile' || !project, 'Mobile uses the accessible project list')
  await page.goto(base)
  await expect(page.getByRole('button', { name: '列表', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.browse-projects')).toBeVisible()
  await expect(page.locator('.desktop-star-map')).not.toBeVisible()
  await page.getByRole('button', { name: '星图', exact: true }).click()
  await expect(page.locator('.desktop-star-map')).toBeVisible()
  await expect(page.locator('.star-node')).toHaveCount(snapshot.projects.filter(project => !project.fork).length)
  const labels = await page.locator('.star-node').evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute('data-project'), texts: Array.from(node.querySelectorAll('.star-label text')).map(text => text.textContent) })))
  for (const label of labels) {
    const entry = snapshot.projects.find(project => project.id === label.id)!
    expect(label.texts).toEqual([entry.title, entry.date.slice(0, 10)])
  }
  const activity = archiveStars(snapshot as unknown as Archive)
  const stars = await page.locator('.star-node').evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute('data-project')!, tier: node.getAttribute('data-activity'), opacity: node.querySelector('.project-star')?.getAttribute('opacity'), scale: node.querySelector('.project-star')?.getAttribute('transform') })))
  for (const star of stars) {
    const expected = activity.get(star.id)!
    expect(star.tier).toBe(String(expected.tier))
    expect(star.opacity).toBe(String(expected.opacity))
    expect(star.scale).toBe(`scale(${expected.radius / 12})`)
  }
  const viewport = page.locator('.universe-map > svg > g')
  await expect(viewport).toHaveAttribute('transform', /scale\(/)
  const initialTransform = await viewport.getAttribute('transform')
  const node = page.locator(`[data-project="${project!.id}"]`)
  await node.focus()
  await page.context().route('https://github.com/**', route => route.fulfill({ contentType: 'text/html', body: '<html><title>Repository</title></html>' }))
  const opened = page.waitForEvent('popup')
  await node.press('Enter')
  const repository = await opened
  await repository.waitForLoadState('domcontentloaded')
  expect(repository.url()).toBe(snapshot.repositories.find(repo => repo.id === project!.repositoryIds[0])!.url)
  await repository.close()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: '放大星图' }).click()
  await expect(viewport).not.toHaveAttribute('transform', initialTransform!)
  await page.getByRole('button', { name: '复位星图' }).click()
  await expect(viewport).toHaveAttribute('transform', initialTransform!)
  await page.getByRole('button', { name: '全屏探索' }).click()
  await expect(page.getByRole('button', { name: '退出全屏' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: '全屏探索' })).toBeVisible()
})

test('unknown accounts and projects return a static 404', async ({ request }) => {
  expect((await request.get('/u/unknown-account')).status()).toBe(404)
  expect((await request.get(`${base}/projects/unknown-project`)).status()).toBe(404)
})

test('every public page and repository alias opens with its own title', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'The same static documents are checked once; mobile flows are covered separately')
  test.setTimeout(120_000)
  const forbidden: string[] = []
  const errors: string[] = []
  page.on('request', request => { if (new URL(request.url()).hostname === 'api.github.com' || !['GET', 'HEAD'].includes(request.method())) forbidden.push(request.url()) })
  page.on('pageerror', error => errors.push(error.message))
  const pages = [...snapshot.projects.map(project => ({ id: project.id, title: project.title })), ...Object.entries(snapshot.aliases).map(([alias, id]) => ({ id: alias, title: snapshot.projects.find(project => project.id === id)!.title }))]
  for (const entry of pages) {
    await page.goto(`${base}/projects/${entry.id}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(entry.title)
    await expect(page).toHaveTitle(new RegExp(entry.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  expect(forbidden).toEqual([])
  expect(errors).toEqual([])
})

test('project details show the latest three commits from the static snapshot', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => { if (new URL(request.url()).hostname === 'api.github.com' || !['GET', 'HEAD'].includes(request.method())) requests.push(request.url()) })
  const selected = snapshot.projects.find(item => item.repositoryIds.some(id => snapshot.repositories.find(repo => repo.id === id)?.commits?.length))
  test.skip(!selected, 'Account has no commits')
  const expected = snapshot.repositories.filter(repo => selected!.repositoryIds.includes(repo.id))
    .flatMap(repo => repo.commits.map(commit => ({ ...commit, repositoryId: repo.id })))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.repositoryId - b.repositoryId || a.sha.localeCompare(b.sha)).slice(0, 3)
  await page.goto(`${base}/projects/${selected!.id}`)
  const section = page.locator('.recent-commits')
  await expect(section.getByRole('heading')).toContainText('最近提交')
  await expect(section.locator('.commit-row')).toHaveCount(expected.length)
  for (const [index, commit] of expected.entries()) {
    const row = section.locator('.commit-row').nth(index)
    await expect(row.locator('.commit-title')).toHaveAttribute('href', commit.url)
    await expect(row.locator('time')).toHaveAttribute('datetime', commit.date)
    await expect(row).toContainText(commit.author)
    await expect(row.locator('code')).toHaveText(commit.sha.slice(0, 7))
  }
  expect(await page.locator('body').evaluate(element => element.scrollWidth <= window.innerWidth)).toBe(true)
  expect(requests).toEqual([])
})

test('project lists default to activity and preserve creation sorting with filters and reloads', async ({ page }) => {
  const visible = snapshot.projects.filter(project => !project.fork)
  const repositoryById = new Map(snapshot.repositories.map(repo => [repo.id, repo]))
  const time = (project: typeof visible[number], mode: string) => {
    const members = project.repositoryIds.map(id => repositoryById.get(id)!)
    return mode === 'created' ? Math.min(...members.map(repo => Date.parse(repo.createdAt))) : Math.max(...members.map(repo => Date.parse(repo.pushedAt ?? repo.createdAt)))
  }
  const expected = (mode: string) => [...visible].sort((a, b) => time(b, mode) - time(a, mode) || a.id.localeCompare(b.id)).map(project => project.title)
  const titles = () => page.locator('.browse-grid .project-card h3').allTextContents()
  await page.goto(base)
  const sort = page.getByRole('combobox', { name: '项目列表排序' })
  await expect(sort).toHaveValue('activity')
  expect((await titles()).map(title => title.trim())).toEqual(expected('activity'))
  await sort.selectOption('created')
  await expect(page).toHaveURL(/sort=created/)
  await expect.poll(async () => (await titles()).map(title => title.trim())).toEqual(expected('created'))
  await page.reload()
  await expect(sort).toHaveValue('created')
  await page.getByRole('searchbox', { name: '搜索项目' }).fill('unlikely-to-match-any-project')
  await expect(page).toHaveURL(/q=unlikely/)
  await expect(sort).toHaveValue('created')
  await sort.selectOption('activity')
  await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBeNull()
  expect(new URL(page.url()).searchParams.get('q')).toBe('unlikely-to-match-any-project')
  expect(await page.locator('body').evaluate(element => element.scrollWidth <= window.innerWidth)).toBe(true)
})
