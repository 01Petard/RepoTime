import snapshot from '../../.generated/archive.json'
import { categoryColor, dateLabel, projectPath, projectYear, type Archive } from '#shared/archive'

export function useArchive() {
  // The build script validates and owns this generated JSON; TS widens its literal fields.
  const archive = snapshot as unknown as Archive
  return { archive, universePath: `/u/${archive.user.login}`, timelinePath: `/u/${archive.user.login}/timeline`, projectPath: (id: string) => projectPath(archive, id), categoryColor, dateLabel, projectYear }
}

export function useProjectFilters(options: { milestones?: boolean } = {}) {
  const { archive } = useArchive()
  const route = useRoute()
  const router = useRouter()
  const years = archive.projects.flatMap(project => [projectYear(project), ...(options.milestones ? project.milestones.map(milestone => Number(milestone.date.slice(0, 4))) : [])])
  const minYear = years.length ? Math.min(...years) : Number(archive.generatedAt.slice(0, 4))
  const maxYear = years.length ? Math.max(...years) : minYear
  const category = computed(() => typeof route.query.category === 'string' ? route.query.category : '')
  const showForks = computed(() => route.query.forks === '1')
  const showArchived = computed(() => route.query.archived !== '0')
  const startYear = computed(() => Math.max(minYear, Math.min(maxYear, Number(route.query.from) || minYear)))
  const endYear = computed(() => Math.max(startYear.value, Math.min(maxYear, Number(route.query.to) || maxYear)))
  const queryText = computed(() => typeof route.query.q === 'string' ? route.query.q : '')
  const categories = [...new Set(archive.projects.map(project => project.category))].sort((a, b) => a.localeCompare(b, 'en'))
  const matchingProjects = computed(() => archive.projects.filter(project => {
    return (!category.value || project.category === category.value) && (showForks.value || !project.fork) && (showArchived.value || !project.archived)
      && (!queryText.value || `${project.title} ${project.description} ${project.technologies.join(' ')}`.toLowerCase().includes(queryText.value.toLowerCase()))
  }))
  const projects = computed(() => matchingProjects.value.filter(project => projectYear(project) >= startYear.value && projectYear(project) <= endYear.value))
  function update(key: string, value: string | undefined) { return router.replace({ query: { ...route.query, [key]: value } }) }
  function reset() { return router.replace({ query: {} }) }
  return { projects, matchingProjects, categories, category, showForks, showArchived, startYear, endYear, minYear, maxYear, queryText, update, reset }
}

export function useArchiveSeo(title: MaybeRefOrGetter<string>, description: MaybeRefOrGetter<string>, image?: string, path: MaybeRefOrGetter<string> = '') {
  const { archive } = useArchive()
  const siteUrl = archive.site.siteUrl
  const route = useRoute()
  const url = computed(() => siteUrl ? new URL(toValue(path) || route.path, siteUrl).href : undefined)
  const imageUrl = siteUrl ? new URL(image ?? '/og.png', siteUrl).href : image ?? '/og.png'
  useSeoMeta({ title: () => toValue(title), description: () => toValue(description), ogTitle: () => toValue(title), ogDescription: () => toValue(description), ogType: 'website', ogImage: imageUrl, ogUrl: () => url.value, twitterCard: 'summary_large_image', twitterTitle: () => toValue(title), twitterDescription: () => toValue(description), twitterImage: imageUrl })
  useHead(() => ({ link: url.value ? [{ rel: 'canonical', href: url.value }] : [] }))
}
