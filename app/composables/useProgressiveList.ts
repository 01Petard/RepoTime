export function useProgressiveList<T>(source: Ref<T[]>, batchSize = 12, enabled: Ref<boolean> = ref(true)) {
  const limit = ref(batchSize)
  const sentinel = ref<HTMLElement | null>(null)
  const items = computed(() => source.value.slice(0, limit.value))
  const hasMore = computed(() => limit.value < source.value.length)
  let observer: IntersectionObserver | undefined

  function loadMore() { limit.value = Math.min(limit.value + batchSize, source.value.length) }
  function revealThrough(index: number) { limit.value = Math.max(limit.value, Math.min(source.value.length, index + batchSize)) }
  watch(source, () => { limit.value = batchSize })
  watch([sentinel, enabled], ([element, active]) => {
    observer?.disconnect()
    if (!element || !active || typeof IntersectionObserver === 'undefined') return
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && hasMore.value) loadMore()
    }, { rootMargin: '0px 0px 300px 0px' })
    observer.observe(element)
  }, { flush: 'post' })
  onBeforeUnmount(() => observer?.disconnect())
  return { items, sentinel, hasMore, loadMore, revealThrough }
}
