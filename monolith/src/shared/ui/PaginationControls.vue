<script lang="ts" setup>
import { computed } from "vue"

const props = defineProps<{
  currentPage: number
  totalPages: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: "change", page: number): void
}>()

const pageItems = computed(() => {
  const pages = new Set([1, props.totalPages])

  for (let page = props.currentPage - 1; page <= props.currentPage + 1; page += 1) {
    if (page > 1 && page < props.totalPages) pages.add(page)
  }

  const sortedPages = Array.from(pages).sort((left, right) => left - right)
  const items: Array<number | string> = []

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1]
    if (previousPage && page - previousPage > 1) items.push(`ellipsis-${previousPage}`)
    items.push(page)
  })

  return items
})

const jumpSteps = computed(() => {
  if (props.totalPages >= 1000) return [100, 500]
  if (props.totalPages >= 100) return [10, 50]
  if (props.totalPages >= 10) return [10]
  return []
})

function changePage(page: number): void {
  if (props.disabled || page === props.currentPage || page < 1 || page > props.totalPages) return
  emit("change", page)
}
</script>

<template>
  <nav class="flex flex-wrap items-center justify-start gap-1" aria-label="Переключение страниц">
    <button
      class="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
      type="button"
      aria-label="Предыдущая страница"
      :disabled="disabled || currentPage <= 1"
      @click="changePage(currentPage - 1)"
    >
      ‹
    </button>

    <button
      v-for="step in [...jumpSteps].reverse()"
      :key="`back-${step}`"
      class="inline-flex h-8 min-w-9 items-center justify-center rounded-md border border-slate-300 bg-white px-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      type="button"
      :disabled="disabled || currentPage <= 1"
      :aria-label="`Назад на ${step} страниц`"
      @click="changePage(Math.max(1, currentPage - step))"
    >
      −{{ step }}
    </button>

    <template v-for="item in pageItems" :key="item">
      <span v-if="typeof item === 'string'" class="inline-flex h-8 min-w-5 items-center justify-center text-sm text-slate-500">…</span>
      <button
        v-else
        class="inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
        :class="item === currentPage ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'"
        type="button"
        :disabled="disabled || item === currentPage"
        :aria-current="item === currentPage ? 'page' : undefined"
        :aria-label="`Страница ${item}`"
        @click="changePage(item)"
      >
        {{ item }}
      </button>
    </template>

    <button
      v-for="step in jumpSteps"
      :key="`forward-${step}`"
      class="inline-flex h-8 min-w-9 items-center justify-center rounded-md border border-slate-300 bg-white px-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      type="button"
      :disabled="disabled || currentPage >= totalPages"
      :aria-label="`Вперёд на ${step} страниц`"
      @click="changePage(Math.min(totalPages, currentPage + step))"
    >
      +{{ step }}
    </button>

    <button
      class="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
      type="button"
      aria-label="Следующая страница"
      :disabled="disabled || currentPage >= totalPages"
      @click="changePage(currentPage + 1)"
    >
      ›
    </button>
  </nav>
</template>
