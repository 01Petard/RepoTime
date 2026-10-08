import { describe, expect, it } from 'vitest'
import { coverDesign } from '../../shared/cover'

describe('automatic decorative covers', () => {
  it.each([
    ['基于 Spring AI 的现代化航班预订平台', 'plane'],
    ['个人健康信息管理平台，记录身体变化', 'activity'],
    ['基于大语言模型的浏览器表单辅助填写扩展插件', 'form'],
    ['An online ChatGPT-style Agent application', 'brain'],
    ['Java class final assignment', 'graduation'],
    ['Expense tracking and budget application', 'wallet'],
    ['An arcade game', 'game'],
  ])('matches descriptions without treating implementation technology as the purpose: %s', (description, icon) => {
    expect(coverDesign('repo-42', description).icon).toBe(icon)
  })
  it('uses a stable abstract fallback for missing descriptions without inventing a purpose', () => {
    expect(coverDesign('repo-42', '').icon).toBe('abstract')
    expect(coverDesign('repo-42', '')).toEqual(coverDesign('repo-42', 'No description of the domain'))
    expect(coverDesign('repo-42', '').cells).not.toEqual(coverDesign('repo-43', '').cells)
  })
  it('does not match AI inside another word or infer a domain from links', () => {
    expect(coverDesign('repo-42', 'A chair https://example.com/health/ai').icon).toBe('abstract')
  })
})
