import { existsSync, readFileSync } from 'node:fs'
import type { Archive } from './shared/archive'

const snapshotPath = new URL('./.generated/archive.json', import.meta.url)
const archive: Archive | null = existsSync(snapshotPath) ? JSON.parse(readFileSync(snapshotPath, 'utf8')) : null
const routes = archive ? [
  '/', `/u/${archive.user.login}`, `/u/${archive.user.login}/timeline`,
  ...archive.projects.map(project => `/u/${archive.user.login}/projects/${project.id}`),
  ...Object.keys(archive.aliases).map(id => `/u/${archive.user.login}/projects/${id}`),
] : ['/']

export default defineNuxtConfig({
  compatibilityDate: '2026-10-08',
  ssr: true,
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css', '~/assets/css/cosmos.css', '~/assets/css/spectrum.css'],
  ui: { fonts: false },
  colorMode: { preference: 'dark', fallback: 'dark' },
  icon: { provider: 'none', fallbackToApi: false, clientBundle: { icons: ['lucide:x', 'lucide:chevron-down', 'lucide:chevron-up', 'lucide:check', 'lucide:chevrons-up-down'] } },
  nitro: { preset: 'static', prerender: { routes, crawlLinks: false, failOnError: true } },
  app: { head: { htmlAttrs: { lang: 'zh-CN' }, meta: [{ name: 'theme-color', content: '#080d19' }], link: [{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }] } },
  devtools: { enabled: false },
})
