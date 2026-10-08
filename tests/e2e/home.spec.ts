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
  const previous = await sky.locator('.sky-selection h3').textContent()
  await sky.getByRole('button', { name: '探索下一颗' }).click()
  if (snapshot.projects.filter(project => project.featured).length > 1) expect(await sky.locator('.sky-selection h3').textContent()).not.toBe(previous)
  const selected = await sky.locator('.sky-selection h3').textContent()
  await page.context().route('https://github.com/**', route => route.fulfill({ contentType: 'text/html', body: '<html><title>Repository</title></html>' }))
  const opened = page.waitForEvent('popup')
  await sky.getByRole('link', { name: '打开 GitHub 仓库' }).click()
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

test('reduced motion shows complete static code without automatic typing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const editor = page.locator('.layer-front .code-window')
  await expect(editor.getByRole('button', { name: '暂停代码动画' })).toBeDisabled()
  await expect(editor.locator('.code-caret')).toHaveCount(0)
  await expect(editor.locator('.code-lines')).toContainText('Keep building. Keep exploring.')
  await editor.getByRole('tab', { name: 'Python' }).click()
  await expect(editor.locator('.code-lines')).toContainText('The journey continues.')
})

test('overlapping code windows move forward on hover and via accessible controls', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.locator('.code-layer')).toHaveCount(3)
  await page.getByRole('button', { name: '将 Python 窗口移到前面' }).click()
  await expect(page.locator('.code-layer-1')).toHaveClass(/layer-front/)
  await expect(page.locator('.code-layer-1 [inert]')).toHaveCount(0)
  await expect(page.locator('.code-layer-0 [inert]')).toHaveCount(1)
  await page.getByRole('button', { name: '将 Shell 窗口移到前面' }).click()
  await expect(page.locator('.code-layer-2')).toHaveClass(/layer-front/)
  if (testInfo.project.name === 'desktop') {
    await page.getByRole('button', { name: '将 TypeScript 窗口移到前面' }).click()
    const point = await page.evaluate(() => {
      const layer = document.querySelector('.code-layer-1')!
      const bounds = layer.getBoundingClientRect()
      for (let y = Math.max(0, bounds.top); y < Math.min(innerHeight, bounds.bottom); y += 8) {
        for (let x = Math.max(0, bounds.left); x < Math.min(innerWidth, bounds.right); x += 8) {
          if (document.elementFromPoint(x, y)?.closest('.code-layer') === layer) return { x, y }
        }
      }
      return null
    })
    expect(point).not.toBeNull()
    await page.mouse.move(point!.x, point!.y)
    await expect(page.locator('.code-layer-1')).toHaveClass(/layer-front/)
  }
  expect(await page.locator('body').evaluate(element => element.scrollWidth <= window.innerWidth)).toBe(true)
})

test('desktop language and recent activity columns share the same height', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Mobile stacks the sections vertically')
  await page.goto('/')
  const heights = await page.evaluate(() => [document.querySelector('.language-paths')!.getBoundingClientRect().height, document.querySelector('.home-recent')!.getBoundingClientRect().height])
  expect(Math.abs(heights[0]! - heights[1]!)).toBeLessThan(1)
  await expect(page.locator('.closing-orbit')).toHaveCount(0)
  expect(await page.locator('body').innerText()).not.toContain('RepoTime')
})
