import { expect, test } from '@playwright/test'
import snapshot from '../../.generated/archive.json' with { type: 'json' }

test('homepage code window supports language tabs, keyboard and pausing', async ({ page }) => {
  await page.goto('/')
  const editor = page.locator('.layer-front .code-window')
  await expect(editor.getByRole('tab', { name: 'TypeScript' })).toHaveAttribute('aria-selected', 'true')
  await editor.getByRole('button', { name: '暂停代码动画' }).click()
  const paused = await editor.locator('.code-lines').textContent()
  await page.waitForTimeout(150)
  expect(await editor.locator('.code-lines').textContent()).toBe(paused)
  await editor.getByRole('tab', { name: 'Python' }).click()
  await expect(editor.getByRole('tabpanel')).toContainText(`developer = "${snapshot.user.login}"`)
  await editor.getByRole('tab', { name: 'Python' }).press('ArrowRight')
  await expect(editor.getByRole('tab', { name: 'Shell' })).toBeFocused()
  await expect(editor.getByRole('tab', { name: 'Shell' })).toHaveAttribute('aria-selected', 'true')
  await expect(editor.getByRole('tabpanel')).toContainText(`repositories=${snapshot.repositories.length}`)
})

test('homepage sky selects real projects and language paths open filtered archives', async ({ page }) => {
  test.skip(!snapshot.projects.some(project => project.featured), 'No featured projects')
  const forbidden: string[] = []
  page.on('request', request => { if (new URL(request.url()).hostname === 'api.github.com' || !['GET', 'HEAD'].includes(request.method())) forbidden.push(request.url()) })
  await page.goto('/')
  const sky = page.locator('.project-sky')
  await expect(sky.locator('.sky-node')).toHaveCount(snapshot.projects.length)
  await expect(sky.locator('.sky-exhibit')).toHaveCount(Math.min(3, snapshot.projects.filter(project => project.featured).length))
  const expectedTiers = new Set(snapshot.repositories.map(repo => repo.pushedAt))
  expect(expectedTiers.size).toBeGreaterThan(1)
  expect(new Set(await sky.locator('.sky-node').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-activity')))).size).toBeGreaterThan(1)
  const repositoryDescription = (index: number) => snapshot.repositories.find(repo => repo.id === snapshot.projects[index]!.repositoryIds[0])!.description.trim() || '该仓库暂未提供简介。'
  await expect(sky.locator('.sky-description')).toBeVisible()
  await expect(sky.locator('.sky-description')).toHaveText(repositoryDescription(0))
  await sky.getByRole('button', { name: '探索下一颗' }).click()
  await expect(sky.locator('.sky-description')).toHaveText(repositoryDescription(1))
  await expect(sky.locator('.sky-description')).toHaveAttribute('title', repositoryDescription(1))
  await sky.locator('.sky-node').nth(2).focus()
  await expect(sky.locator('.sky-description')).toHaveText(repositoryDescription(2))
  const selected = await sky.locator('.sky-exhibit h3').first().textContent()
  await page.context().route('https://github.com/**', route => route.fulfill({ contentType: 'text/html', body: '<html><title>Repository</title></html>' }))
  const opened = page.waitForEvent('popup')
  await sky.getByRole('link', { name: '打开 GitHub 仓库' }).first().click()
  const repository = await opened
  await repository.waitForLoadState('domcontentloaded')
  const entry = snapshot.projects.find(project => project.title === selected)!
  expect(repository.url()).toBe(snapshot.repositories.find(repo => repo.id === entry.repositoryIds[0])!.url)
  await repository.close()
  await page.goto('/')
  const link = page.locator('.language-links a').first()
  const href = await link.getAttribute('href')
  await link.click()
  await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBe(new URL(href!, 'http://localhost').searchParams.get('category'))
  expect(forbidden).toEqual([])
  expect(await page.locator('body').evaluate(element => element.scrollWidth <= window.innerWidth)).toBe(true)
})

test('code autoplay types all eight languages, holds for three seconds and loops', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-09T00:00:00Z') })
  await page.clock.pauseAt(new Date('2026-10-09T00:00:01Z'))
  await page.goto('/')
  const editor = page.locator('.layer-front .code-window')
  await editor.scrollIntoViewIfNeeded()
  await expect(editor.locator('.code-caret')).toHaveCount(1)
  const languages = ['TypeScript', 'Python', 'Shell', 'Java', 'Go', 'Kotlin', 'C#', 'PHP']
  await expect(editor.getByRole('tab')).toHaveCount(languages.length)
  for (const [index, language] of languages.entries()) {
    const tab = editor.getByRole('tab', { name: language, exact: true })
    await expect(tab).toHaveAttribute('aria-selected', 'true')
    const code = (await editor.locator('pre').textContent())!
    await page.clock.runFor(Math.ceil(code.length / 2) * 28)
    await expect(editor.locator('.code-caret')).toHaveCount(0)
    await expect(editor.locator('.code-lines')).toContainText(code.split('\n').at(-1)!)
    if (index === 0) {
      await editor.getByRole('button', { name: '暂停代码动画' }).click()
      await page.clock.runFor(10000)
      await expect(tab).toHaveAttribute('aria-selected', 'true')
      await editor.getByRole('button', { name: '继续代码动画' }).click()
    }
    await page.clock.runFor(2999)
    await expect(tab).toHaveAttribute('aria-selected', 'true')
    await page.clock.runFor(1)
    await expect(editor.getByRole('tab', { name: languages[(index + 1) % languages.length], exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(editor.locator('.code-caret')).toHaveCount(1)
  }
  expect(await page.locator('body').evaluate(element => element.scrollWidth <= window.innerWidth)).toBe(true)
})

test('reduced motion shows complete static code without automatic typing', async ({ page }) => {
  await page.clock.install()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const editor = page.locator('.layer-front .code-window')
  await expect(editor.getByRole('button', { name: '暂停代码动画' })).toBeDisabled()
  await expect(editor.locator('.code-caret')).toHaveCount(0)
  await expect(editor.locator('.code-lines')).toContainText('Keep building. Keep exploring.')
  await page.clock.runFor(20000)
  await expect(editor.getByRole('tab', { name: 'TypeScript', exact: true })).toHaveAttribute('aria-selected', 'true')
  await editor.getByRole('tab', { name: 'Python' }).click()
  await expect(editor.locator('.code-lines')).toContainText('The journey continues.')
  await editor.getByRole('tab', { name: 'PHP', exact: true }).click()
  await expect(editor.locator('.code-lines')).toContainText('<?php')
})

test('code windows keep their fixed stack while interacting', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.code-layer')).toHaveCount(3)
  await expect(page.locator('.code-stack-selector')).toHaveCount(0)
  const before = await page.locator('.code-layer').evaluateAll(layers => layers.map(layer => ({ transform: getComputedStyle(layer).transform, zIndex: getComputedStyle(layer).zIndex })))
  await page.locator('.layer-front').hover()
  await page.locator('.layer-front').getByRole('tab', { name: 'Python' }).click()
  const after = await page.locator('.code-layer').evaluateAll(layers => layers.map(layer => ({ transform: getComputedStyle(layer).transform, zIndex: getComputedStyle(layer).zIndex })))
  expect(after).toEqual(before)
  await expect(page.locator('.code-layer-0')).toHaveClass(/layer-front/)
  await expect(page.locator('.code-layer-1 [inert]')).toHaveCount(1)
  expect(await page.locator('body').evaluate(element => element.scrollWidth <= window.innerWidth)).toBe(true)
})

test('home keeps compact controls, five UTC+8 commits and the requested footer', async ({ page }) => {
  await page.goto('/')
  const count = Math.min(5, snapshot.repositories.reduce((sum, repo) => sum + (repo.commits?.length ?? 0), 0))
  await expect(page.locator('.home-commit')).toHaveCount(count)
  const heights = await page.locator('.home-signals > div').evaluateAll(panels => panels.map(panel => panel.getBoundingClientRect().height))
  expect(Math.abs(heights[0]! - heights[1]!)).toBeLessThan(1)
  expect(await page.locator('.home-commit').first().evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(90)
  const latest = snapshot.repositories.flatMap(repo => repo.commits ?? []).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0]!
  const local = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(latest.date))
  await expect(page.locator('.home-commit time').first()).toHaveText(`${local} UTC+8`)
  await expect(page.locator('.header-profile')).toHaveCount(0)
  await expect(page.locator('.site-footer')).toContainText('代码时光机 · Every repository tells a story.')
  await expect(page.locator('.site-footer')).toContainText('基于已公开的仓库档案')
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg')
  const languageLayout = await page.locator('.language-paths').evaluate(panel => {
    const grid = panel.querySelector('.language-links')!
    const style = getComputedStyle(panel)
    return {
      bottomGap: panel.getBoundingClientRect().bottom - grid.getBoundingClientRect().bottom,
      bottomInset: parseFloat(style.paddingBottom) + parseFloat(style.borderBottomWidth),
      heights: Array.from(grid.querySelectorAll('a')).map(link => link.getBoundingClientRect().height),
    }
  })
  expect(languageLayout.bottomGap).toBeCloseTo(languageLayout.bottomInset, 0)
  expect(Math.max(...languageLayout.heights) - Math.min(...languageLayout.heights)).toBeLessThan(1)
  expect(Math.min(...languageLayout.heights)).toBeGreaterThanOrEqual(40)
})

test('headline types, deletes, pauses and cycles through phrases', async ({ page }) => {
  await page.clock.install()
  await page.goto('/')
  const typed = page.locator('.typewriter-text')
  const original = snapshot.site.headline
  for (let step = 0; step < 20 && await typed.textContent() !== original; step++) await page.clock.runFor(400)
  await expect(typed).toHaveText(original)
  await page.clock.runFor(500)
  await expect(typed).toHaveText(original)
  for (let step = 0; step < 40 && await typed.textContent() === original; step++) await page.clock.runFor(100)
  expect((await typed.textContent())!.length).toBeLessThan(original.length)
  for (const phrase of ['每一个想法，\n都值得留下。', '从一次提交，\n到一段旅程。', '下一行代码，\n故事仍在继续。', original]) {
    for (let step = 0; step < 40 && await typed.textContent() !== phrase; step++) await page.clock.runFor(400)
    await expect(typed).toHaveText(phrase)
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(typed).toHaveText(original)
})

test('navigation stays visible and the full sidebar sticks immediately below it', async ({ page }, testInfo) => {
  for (const path of [`/u/${snapshot.user.login}`, `/u/${snapshot.user.login}/timeline`]) {
    await page.goto(path)
    await expect(page.locator('.sidebar-profile')).toBeVisible()
    await expect(page.locator('.sidebar-profile img')).toBeVisible()
    await expect(page.locator('.sidebar-profile strong')).toHaveText(snapshot.user.name)
    await expect(page.locator('.category-filter .language-icon').first()).toBeVisible()
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }))
    await expect(page.locator('.site-header')).toBeInViewport()
    const header = await page.locator('.site-header').boundingBox()
    expect(header!.y).toBe(0)
    expect(header!.height).toBe(testInfo.project.name === 'mobile' ? 64 : 72)
    const down = await page.locator('.archive-sidebar').boundingBox()
    expect(down!.y).toBeCloseTo(header!.y + header!.height, 0)
    expect(down!.height).toBeLessThanOrEqual(testInfo.project.use.viewport!.height - header!.height)
    await expect(page.locator('.sidebar-profile')).toBeInViewport()
    const authorTop = (await page.locator('.sidebar-profile').boundingBox())!.y
    await page.locator('.sidebar-body').evaluate(element => { element.scrollTop = element.scrollHeight })
    expect((await page.locator('.sidebar-profile').boundingBox())!.y).toBeCloseTo(authorTop, 0)
    await expect(page.locator('.sidebar-note')).toBeInViewport()
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }))
    await expect(page.locator('.site-header')).toBeInViewport()
    expect((await page.locator('.site-header').boundingBox())!.y).toBe(0)
    const up = await page.locator('.archive-sidebar').boundingBox()
    expect(up!.y).toBeCloseTo(testInfo.project.name === 'mobile' ? 64 : 72, 0)
  }
})


test('homepage stars scatter across the rectangle, resize and remain stable on reload', async ({ page }, testInfo) => {
  await page.goto('/')
  const sizes = testInfo.project.name === 'desktop' ? [{ width: 1440, height: 1000 }, { width: 1024, height: 900 }] : [{ width: 390, height: 844 }]
  for (const size of sizes) {
    await page.setViewportSize(size)
    await expect.poll(() => page.locator('.sky-chart > svg').evaluate(element => {
      const svg = element as SVGSVGElement
      return Math.abs(svg.viewBox.baseVal.width - svg.getBoundingClientRect().width)
    })).toBeLessThan(1)
    const bounds = await page.locator('.sky-chart > svg').evaluate(element => {
      const svg = element as SVGSVGElement
      const box = svg.getBoundingClientRect()
      const centers = Array.from(svg.querySelectorAll<SVGGraphicsElement>('.sky-node > g')).map(node => {
        const matrix = node.getScreenCTM()!
        return { x: matrix.e - box.left, y: matrix.f - box.top }
      })
      return { centers, width: box.width, height: box.height, left: Math.min(...centers.map(node => node.x)), right: box.width - Math.max(...centers.map(node => node.x)), top: Math.min(...centers.map(node => node.y)), bottom: box.height - Math.max(...centers.map(node => node.y)) }
    })
    for (const inset of [bounds.left, bounds.right, bounds.top, bounds.bottom]) {
      expect(inset).toBeGreaterThanOrEqual(32)
      expect(inset).toBeLessThan(62)
    }
    expect(bounds.height).toBe(360)
    expect(new Set(bounds.centers.map(node => Math.round(node.y / 8))).size).toBeGreaterThan(18)
    let nearest = Infinity
    for (let first = 0; first < bounds.centers.length; first++) {
      for (let second = first + 1; second < bounds.centers.length; second++) {
        nearest = Math.min(nearest, Math.hypot(bounds.centers[first]!.x - bounds.centers[second]!.x, bounds.centers[first]!.y - bounds.centers[second]!.y))
      }
    }
    expect(nearest).toBeGreaterThan(28)
    await expect(page.locator('.sky-node')).toHaveCount(snapshot.projects.length)
    const positions = await page.locator('.sky-node > g').evaluateAll(nodes => nodes.map(node => node.getAttribute('transform')))
    await page.reload()
    await expect.poll(() => page.locator('.sky-node > g').evaluateAll(nodes => nodes.map(node => node.getAttribute('transform')))).toEqual(positions)
  }
})
