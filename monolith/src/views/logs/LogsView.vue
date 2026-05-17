<script lang="ts" setup>
import { computed, onMounted, ref } from "vue"
import { RefreshCwIcon } from "@lucide/vue"
import { useApiClient } from "@/application/api"
import { useStore } from "@/application/store"
import { ApiError } from "@/shared/api"

const apiClient = useApiClient()
const store = useStore()

const isLoading = ref(false)
const errorMessage = ref("")

const logs = computed(() => store.state.logs.logs)

onMounted(() => {
  loadLogs()
})

function loadLogs(): void {
  isLoading.value = true
  errorMessage.value = ""

  apiClient.logs.list()
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось загрузить логи"
    })
    .finally(() => {
      isLoading.value = false
    })
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(new Date(value))
}

function formatContext(value: iSharedLogs.LogValue): string {
  return JSON.stringify(value ?? null, null, 2)
}

function getLevelClass(level: iSharedLogs.LogLevel): string {
  if (level === "error") return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
  if (level === "warn") return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
  if (level === "debug") return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
  return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
}
</script>

<template>
  <section class="p-4 lg:p-6">
    <div class="mb-5 flex items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold text-slate-950 dark:text-slate-50">Логи</h1>
      <button
        class="inline-flex min-h-9 items-center gap-2 rounded-md border border-blue-200 px-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
        type="button"
        :disabled="isLoading"
        @click="loadLogs"
      >
        <RefreshCwIcon class="h-4 w-4" aria-hidden="true" />
        Обновить
      </button>
    </div>

    <div v-if="errorMessage" class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" role="alert">
      {{ errorMessage }}
    </div>

    <div class="overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div class="grid grid-cols-[11rem_6rem_10rem_minmax(18rem,1fr)] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        <span>Время</span>
        <span>Уровень</span>
        <span>Источник</span>
        <span>Событие</span>
      </div>

      <div v-if="isLoading" class="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Загрузка логов
      </div>

      <div v-else-if="!logs.length" class="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Логи пока не получены
      </div>

      <div v-else class="divide-y divide-slate-200 dark:divide-slate-700">
        <article
          v-for="log in logs"
          :key="log.uid"
          class="grid grid-cols-[11rem_6rem_10rem_minmax(18rem,1fr)] gap-3 px-4 py-3 text-sm"
        >
          <time class="text-slate-500 dark:text-slate-400" :datetime="log.timestamp">{{ formatDate(log.timestamp) }}</time>
          <span>
            <span class="inline-flex rounded px-2 py-1 text-xs font-semibold" :class="getLevelClass(log.level)">
              {{ log.level }}
            </span>
          </span>
          <span class="truncate text-slate-600 dark:text-slate-300">{{ log.source }}</span>
          <div class="min-w-0">
            <div class="font-medium text-slate-950 dark:text-slate-50">{{ log.message }}</div>
            <pre class="mt-2 max-h-44 overflow-auto rounded bg-slate-950 p-3 text-xs leading-5 text-slate-100">{{ formatContext(log.context) }}</pre>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
