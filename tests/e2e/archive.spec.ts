import { expect, test } from '@playwright/test'
import { archiveStars, universeActivityLevels } from '../../shared/stars'
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

test('RepoTime keeps its actual project and repository names', async ({ page }) => {
  const repository = snapshot.repositories.find(repo => repo.name === 'RepoTime')
  const entry = snapshot.projects.find(project => project.repositoryIds.includes(repository?.id ?? 0))
  test.skip(!entry || !repository, 'This account has no RepoTime repository')
  expect(entry!.title).toBe('RepoTime')
  await page.goto('/')
  await expect(page.locator('.sky-exhibit h3').filter({ hasText: /^RepoTime$/ })).toBeVisible()
  await page.goto(base)
  await page.getByRole('searchbox', { name: '搜索项目' }).fill('RepoTime')
  await expect(page.locator('.project-card h3').first()).toHaveText('RepoTime')
  await page.goto(`${base}/projects/${entry!.id}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('RepoTime')
  await expect(page.locator('.repository-row strong').filter({ hasText: repository!.fullName })).toBeVisible()
  await expect(page.locator('.repository-row').filter({ hasText: repository!.fullName })).toHaveAttribute('href', repository!.url)
  await expect(page.locator('body')).not.toContainText('项目时光机')
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
  await expect(page.getByRole('button', { name: '网格', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.browse-projects')).toBeVisible()
  await expect(page.locator('.desktop-star-map')).not.toBeVisible()
  await page.getByRole('button', { name: '星图', exact: true }).click()
  await expect(page.locator('.desktop-star-map')).toBeVisible()
  await expect(page.locator('.star-node')).toHaveCount(snapshot.projects.filter(project => !project.fork).length)
  const labels = await page.locator('.star-node').evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute('data-project'), texts: Array.from(node.querySelectorAll('.star-label text')).map(text => text.textContent) })))
  for (const label of labels) {
    const entry = snapshot.projects.find(project => project.id === label.id)!
    expect(label.texts).toEqual([entry.title])
  }
  const activity = archiveStars(snapshot as unknown as Archive)
  const stars = await page.locator('.star-node').evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute('data-project')!, tier: node.getAttribute('data-activity'), opacity: node.querySelector('.project-star')?.getAttribute('opacity'), scale: node.querySelector('.project-star')?.getAttribute('transform') })))
  for (const star of stars) {
    const expected = { ...activity.get(star.id)!, ...universeActivityLevels[activity.get(star.id)!.tier]! }
    expect(star.tier).toBe(String(expected.tier))
    expect(star.opacity).toBe(String(expected.opacity))
    expect(star.scale).toBe(`scale(${expected.radius / 12})`)
  }
  const viewport = page.locator('.universe-map > svg > g')
  await expect(viewport).toHaveAttribute('transform', /scale\(/)
  const initialTransform = await viewport.getAttribute('transform')
  await expect(page.locator('.map-year, .map-band')).toHaveCount(0)
  const labelBounds = await page.locator('.universe-map .star-label:not(.label-distant) text').evaluateAll(labels => labels.map(label => {
    const rect = label.getBoundingClientRect()
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
  }))
  for (const [index, label] of labelBounds.entries()) {
    for (const other of labelBounds.slice(index + 1)) {
      expect(label.right <= other.left || other.right <= label.left || label.bottom <= other.top || other.bottom <= label.top).toBe(true)
    }
  }
  const projectNames = await page.locator('.universe-map .star-node text').allTextContents()
  expect(await page.locator('.universe-map > svg text').allTextContents()).toEqual(projectNames)
  expect(projectNames.every(name => snapshot.projects.some(project => project.title === name))).toBe(true)
  await expect(page.locator('.map-link').first()).toBeVisible()
  const map = page.locator('.universe-map > svg')
  await map.scrollIntoViewIfNeeded()
  const box = (await map.boundingBox())!
  expect(box.width / box.height).toBeCloseTo(16 / 9, 1)
  await page.mouse.move(box.x + 8, box.y + 8)
  const scrollBefore = await page.evaluate(() => window.scrollY)
  await page.mouse.wheel(0, 220)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore)
  await expect(viewport).toHaveAttribute('transform', initialTransform!)
  await map.scrollIntoViewIfNeeded()
  const dragBox = (await map.boundingBox())!
  await page.mouse.move(dragBox.x + 8, dragBox.y + 8)
  await page.mouse.down()
  await page.mouse.move(dragBox.x + 88, dragBox.y + 68, { steps: 6 })
  await page.mouse.up()
  await expect(viewport).not.toHaveAttribute('transform', initialTransform!)
  await page.getByRole('button', { name: '复位星图' }).click()
  await expect(viewport).toHaveAttribute('transform', initialTransform!)

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
    await expect(row.locator('time')).toHaveText(new Date(commit.date).toISOString().replace('T', ' ').replace('.000Z', ' UTC'))
    await expect(row).toContainText(commit.author)
    await expect(row.locator('code')).toHaveText(commit.sha.slice(0, 7))
  }
  expect(await page.locator('body').evaluate(element => element.scrollWidth <= window.innerWidth)).toBe(true)
  await page.goto('/')
  await expect(page.locator('.home-commit time')).toHaveCount(Math.min(5, snapshot.repositories.reduce((total, repo) => total + repo.commits.length, 0)))
  for (const time of await page.locator('.home-commit time').all()) {
    const date = (await time.getAttribute('datetime'))!
    await expect(time).toHaveText(`${new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(date))} UTC+8`)
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
  await expect(sort).toContainText('最近活跃')
  expect((await titles()).map(title => title.trim())).toEqual(expected('activity').slice(0, 12))
  await sort.click()
  await expect(page.getByRole('option', { name: '最近活跃', exact: true })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await expect(sort).toBeFocused()
  await expect(sort).toContainText('最近活跃')
  await sort.press('ArrowDown')
  await expect(page.getByRole('option', { name: '最近活跃', exact: true })).toBeFocused()
  await page.keyboard.press('End')
  await expect(page.getByRole('option', { name: '创建时间', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/sort=created/)
  await expect.poll(async () => (await titles()).map(title => title.trim())).toEqual(expected('created').slice(0, 12))
  await page.reload()
  await expect(sort).toContainText('创建时间')
  await page.getByRole('searchbox', { name: '搜索项目' }).fill('unlikely-to-match-any-project')
  await expect(page).toHaveURL(/q=unlikely/)
  await expect(sort).toContainText('创建时间')
  await sort.click()
  await page.getByRole('option', { name: '最近活跃', exact: true }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBeNull()
  expect(new URL(page.url()).searchParams.get('q')).toBe('unlikely-to-match-any-project')
  expect(await page.locator('body').evaluate(element => element.scrollWidth <= window.innerWidth)).toBe(true)
})


test('universe progressively renders projects, appends on scroll and resets after sorting', async ({ page }) => {
  await page.goto(base)
  const cards = page.locator('.browse-grid .project-card')
  await expect(cards).toHaveCount(Math.min(12, snapshot.projects.filter(project => !project.fork).length))
  await expect(page.locator('.star-node')).toHaveCount(0)
  const initial = await cards.count()
  test.skip(snapshot.projects.filter(project => !project.fork).length <= initial, 'Archive fits in the first batch')
  await page.locator('.progressive-loader').scrollIntoViewIfNeeded()
  await expect.poll(() => cards.count()).toBeGreaterThan(initial)
  const ids = await cards.evaluateAll(cards => cards.map(card => card.getAttribute('href')))
  expect(new Set(ids).size).toBe(ids.length)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.getByRole('combobox', { name: '项目列表排序' }).click()
  await page.getByRole('option', { name: '创建时间', exact: true }).click()
  await expect(cards).toHaveCount(12)
  await page.getByRole('searchbox', { name: '搜索项目' }).fill('TrackFit')
  await expect(cards).toHaveCount(1)
  await expect(page.locator('.progressive-loader')).toContainText('已展示全部记录')
})

test('timeline appends events on scroll and renders an unloaded year before jumping', async ({ page }) => {
  await page.goto(`${base}/timeline`)
  const entries = page.locator('.timeline-entry')
  await expect(entries).toHaveCount(12)
  await page.locator('.progressive-loader').scrollIntoViewIfNeeded()
  await expect.poll(() => entries.count()).toBeGreaterThan(12)
  const year = page.locator('.year-nav button').last()
  const target = (await year.textContent())!.trim().slice(0, 4)
  await year.click()
  await expect(page.locator(`#year-${target}`)).toBeInViewport()
  const ids = await entries.evaluateAll(entries => entries.map(entry => entry.getAttribute('data-event')))
  expect(new Set(ids).size).toBe(ids.length)
})


test('archive pages share typography and card design with borderless top navigation', async ({ page }) => {
  const styles = []
  for (const path of [base, `${base}/timeline`]) {
    await page.goto(path)
    const timeline = path.endsWith('/timeline')
    styles.push(await page.evaluate(({ timeline }) => {
      const style = (selector: string) => getComputedStyle(document.querySelector(selector)!)
      const card = style(timeline ? '.timeline-entry-content' : '.project-card')
      const title = style(timeline ? '.timeline-entry-content h3' : '.project-card h3')
      const description = style(timeline ? '.timeline-entry-content > p' : '.project-card p')
      return {
        heading: style('.explore-heading h1').fontSize,
        headingWeight: style('.explore-heading h1').fontWeight,
        intro: style('.explore-heading p:not(.eyebrow)').fontSize,
        period: style('.heading-period').display,
        switchSize: style('.explore-heading > .text-link').fontSize,
        cardTitle: title.fontSize,
        cardTitleWeight: title.fontWeight,
        cardDescription: description.fontSize,
        cardLineHeight: description.lineHeight,
        cardBorder: card.borderColor,
        cardRadius: card.borderRadius,
        cardBackground: card.backgroundImage,
        categorySize: style(timeline ? '.timeline-entry-content .eyebrow' : '.project-card-meta').fontSize,
        technologySize: style(timeline ? '.timeline-tech > span' : '.card-technologies > span').fontSize,
      }
    }, { timeline }))
    for (const link of await page.locator('.site-header nav a').all()) {
      const nav = await link.evaluate(element => ({ border: getComputedStyle(element).borderWidth, background: getComputedStyle(element).backgroundColor }))
      expect(nav).toEqual({ border: '0px', background: 'rgba(0, 0, 0, 0)' })
    }
    expect(await page.locator('body').evaluate(element => element.scrollWidth <= innerWidth)).toBe(true)
  }
  expect(styles[1]).toEqual(styles[0])
  expect(styles[0]!.period).toBe('block')
})
