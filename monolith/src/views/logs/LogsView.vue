<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { ChevronLeftIcon, ChevronRightIcon, RefreshCwIcon, SearchIcon, XIcon } from "@lucide/vue"
import { useApiClient } from "@/application/api"
import { useStore } from "@/application/store"
import { ApiError } from "@/shared/api"

type LogLevelFilter = "all" | iSharedLogs.LogLevel
type LogKindFilter = "all" | iSharedLogs.LogKind

const apiClient = useApiClient()
const route = useRoute()
const store = useStore()

const isLoading = ref(false)
const errorMessage = ref("")
const levelFilter = ref<LogLevelFilter>("all")
const kindFilter = ref<LogKindFilter>("all")
const searchQuery = ref("")
const pageLimit = ref(50)
const currentPage = ref(1)

const logs = computed(() => store.state.logs.logs)
const packageUid = computed(() => typeof route.params.packageUid === "string" ? route.params.packageUid : "")
const packageSource = computed(() => typeof route.query.source === "string" ? route.query.source : "package")
const totalLogs = computed(() => store.state.logs.total)
const totalPages = computed(() => Math.max(1, Math.ceil(totalLogs.value / pageLimit.value)))
const pageOffset = computed(() => (currentPage.value - 1) * pageLimit.value)
const pageStart = computed(() => totalLogs.value ? pageOffset.value + 1 : 0)
const pageEnd = computed(() => Math.min(pageOffset.value + logs.value.length, totalLogs.value))
const filteredLogs = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return logs.value.filter((log) => {
    if (levelFilter.value !== "all" && log.level !== levelFilter.value) return false
    if (kindFilter.value !== "all" && log.kind !== kindFilter.value) return false
    if (!query) return true

    return [
      log.source,
      getKindLabel(log.kind),
      log.level,
      log.message,
      formatContext(log.context)
    ].some((value) => value.toLowerCase().includes(query))
  })
})

onMounted(() => {
  loadLogs()
})

watch(packageUid, () => {
  currentPage.value = 1
  loadLogs()
})

function loadLogs(): void {
  if (!packageUid.value) {
    errorMessage.value = "Не указан пакет для просмотра логов"
    return
  }

  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
  }

  isLoading.value = true
  errorMessage.value = ""

  apiClient.logs.list({
    limit: pageLimit.value,
    offset: pageOffset.value,
    level: levelFilter.value === "all" ? undefined : levelFilter.value,
    kind: kindFilter.value === "all" ? undefined : kindFilter.value,
    packageUid: packageUid.value
  })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось загрузить логи"
    })
    .finally(() => {
      isLoading.value = false
    })
}

function resetFilters(): void {
  levelFilter.value = "all"
  kindFilter.value = "all"
  searchQuery.value = ""
  currentPage.value = 1
  loadLogs()
}

function applyServerFilters(): void {
  currentPage.value = 1
  loadLogs()
}

function setLimit(value: string): void {
  pageLimit.value = Number(value)
  currentPage.value = 1
  loadLogs()
}

function goToPreviousPage(): void {
  if (currentPage.value <= 1) return
  currentPage.value -= 1
  loadLogs()
}

function goToNextPage(): void {
  if (currentPage.value >= totalPages.value) return
  currentPage.value += 1
  loadLogs()
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

function getKindLabel(kind: iSharedLogs.LogKind): string {
  if (kind === "collector_connection") return "Подключение collector"
  if (kind === "collector_disconnection") return "Отключение collector"
  return "Прикладной"
}
</script>

<template>
  <section class="p-4 lg:p-6">
    <div class="mb-5 flex items-center justify-between gap-3">
      <div class="min-w-0">
        <router-link class="mb-2 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200" :to="{ name: 'system' }">
          Назад к системе
        </router-link>
        <h1 class="truncate text-2xl font-semibold text-slate-950 dark:text-slate-50">Логи пакета {{ packageSource }}</h1>
        <div class="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{{ packageUid }}</div>
      </div>
      <button
        class="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md border border-blue-200 px-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
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

    <div class="mb-4 grid gap-3 lg:grid-cols-[11rem_14rem_minmax(16rem,1fr)_auto]">
      <select
        v-model="levelFilter"
        class="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        aria-label="Уровень логов"
        @change="applyServerFilters"
      >
        <option value="all">Все уровни</option>
        <option value="debug">debug</option>
        <option value="info">info</option>
        <option value="warn">warn</option>
        <option value="error">error</option>
      </select>

      <select
        v-model="kindFilter"
        class="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        aria-label="Тип логов"
        @change="applyServerFilters"
      >
        <option value="all">Все типы</option>
        <option value="application">Прикладные</option>
        <option value="collector_connection">Подключения collector</option>
        <option value="collector_disconnection">Отключения collector</option>
      </select>

      <label class="relative block">
        <SearchIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          v-model="searchQuery"
          class="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          type="search"
          placeholder="Поиск"
          aria-label="Поиск по логам"
        >
      </label>

      <button
        class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        type="button"
        @click="resetFilters"
      >
        <XIcon class="h-4 w-4" aria-hidden="true" />
        Сбросить
      </button>
    </div>

    <div class="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
      <div>
        {{ pageStart }}-{{ pageEnd }} из {{ totalLogs }}
      </div>

      <div class="flex items-center gap-2">
        <select
          class="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          :value="pageLimit"
          aria-label="Количество логов на странице"
          @change="setLimit(($event.target as HTMLSelectElement).value)"
        >
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="300">300</option>
        </select>

        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          type="button"
          :disabled="isLoading || currentPage <= 1"
          aria-label="Предыдущая страница"
          @click="goToPreviousPage"
        >
          <ChevronLeftIcon class="h-4 w-4" aria-hidden="true" />
        </button>

        <span class="min-w-[5rem] text-center">{{ currentPage }} / {{ totalPages }}</span>

        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          type="button"
          :disabled="isLoading || currentPage >= totalPages"
          aria-label="Следующая страница"
          @click="goToNextPage"
        >
          <ChevronRightIcon class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div class="overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div class="grid grid-cols-[11rem_6rem_12rem_10rem_minmax(18rem,1fr)] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        <span>Время</span>
        <span>Уровень</span>
        <span>Тип</span>
        <span>Источник</span>
        <span>Событие</span>
      </div>

      <div v-if="isLoading" class="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Загрузка логов
      </div>

      <div v-else-if="!logs.length" class="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Логи пока не получены
      </div>

      <div v-else-if="!filteredLogs.length" class="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Логи не найдены
      </div>

      <div v-else class="divide-y divide-slate-200 dark:divide-slate-700">
        <article
          v-for="log in filteredLogs"
          :key="log.uid"
          class="grid grid-cols-[11rem_6rem_12rem_10rem_minmax(18rem,1fr)] gap-3 px-4 py-3 text-sm"
        >
          <time class="text-slate-500 dark:text-slate-400" :datetime="log.timestamp">{{ formatDate(log.timestamp) }}</time>
          <span>
            <span class="inline-flex rounded px-2 py-1 text-xs font-semibold" :class="getLevelClass(log.level)">
              {{ log.level }}
            </span>
          </span>
          <span class="text-slate-600 dark:text-slate-300">{{ getKindLabel(log.kind) }}</span>
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
