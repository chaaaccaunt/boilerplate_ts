<script lang="ts" setup>
import { DownloadIcon } from "@lucide/vue"

defineProps<{
  areAllItemsSelected: boolean
  selectedItemsCount: number
  selectedFilesCount: number
  selectedDocumentsCount: number
  isBulkDownloading: boolean
  bulkDownloadButtonText: string
}>()

const emit = defineEmits<{
  (event: "toggle-all"): void
  (event: "download-selected"): void
  (event: "set-visibility", visibility: iSharedFiles.FileVisibility): void
  (event: "delete-selected"): void
}>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
    <label class="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
      <input
        class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-950"
        type="checkbox"
        :checked="areAllItemsSelected"
        @change="emit('toggle-all')"
      >
      Все
    </label>
    <span class="text-slate-500 dark:text-slate-400">Выбрано: {{ selectedItemsCount }}</span>
    <button
      class="inline-flex min-h-9 min-w-32 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      type="button"
      :disabled="(!selectedFilesCount && !selectedDocumentsCount) || isBulkDownloading"
      @click="emit('download-selected')"
    >
      <DownloadIcon class="h-4 w-4" aria-hidden="true" />
      {{ bulkDownloadButtonText }}
    </button>
    <button
      class="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 px-3 font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      type="button"
      :disabled="!selectedItemsCount"
      @click="emit('set-visibility', 'private')"
    >
      Скрыть
    </button>
    <button
      class="inline-flex min-h-9 items-center justify-center rounded-md border border-red-200 px-3 font-medium text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
      type="button"
      :disabled="!selectedItemsCount"
      @click="emit('delete-selected')"
    >
      Удалить
    </button>
  </div>
</template>
