<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from "vue"
import { ListTreeIcon, RefreshCwIcon } from "@lucide/vue"
import { useApiClient } from "@/application/api"
import { useWebSocketClient } from "@/application/realtime"
import { useStore } from "@/application/store"
import { ApiError } from "@/shared/api"

const apiClient = useApiClient()
const webSocketClient = useWebSocketClient()
const store = useStore()

const isLoading = ref(false)
const updatingPackageUid = ref<string | null>(null)
const errorMessage = ref("")
const metrics = computed(() => store.state.system.metrics)
const onlineCount = computed(() => metrics.value.filter((item) => item.status === "online").length)
const unavailableCount = computed(() => metrics.value.length - onlineCount.value)
const warningCount = computed(() => metrics.value.reduce((sum, item) => sum + item.logSummary.warnCount, 0))
const errorCount = computed(() => metrics.value.reduce((sum, item) => sum + item.logSummary.errorCount, 0))

onMounted(() => {
  webSocketClient.on<iSharedLogs.RuntimePackageConnectionEventDto>("system:package-connection", handlePackageConnectionEvent)
  loadMetrics()
})

onUnmounted(() => {
  webSocketClient.off("system:package-connection")
})

function handlePackageConnectionEvent(event: iSharedLogs.RuntimePackageConnectionEventDto): void {
  store.commit("system/applyPackageConnectionEvent", event)
  loadMetric(event.packageUid)
}

function loadMetrics(): void {
  isLoading.value = true
  errorMessage.value = ""

  apiClient.system.metrics()
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось загрузить метрики"
    })
    .finally(() => {
      isLoading.value = false
    })
}

function loadMetric(packageUid: string): void {
  updatingPackageUid.value = packageUid
  errorMessage.value = ""

  apiClient.system.metric(packageUid)
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось обновить метрики пакета"
    })
    .finally(() => {
      updatingPackageUid.value = null
    })
}

function formatBytes(value: number): string {
  const units = ["Б", "КБ", "МБ", "ГБ", "ТБ"]
  let nextValue = value
  let unitIndex = 0

  while (nextValue >= 1024 && unitIndex < units.length - 1) {
    nextValue /= 1024
    unitIndex += 1
  }

  return `${nextValue.toFixed(unitIndex ? 1 : 0)} ${units[unitIndex]}`
}

function formatPercent(value: number | null): string {
  return value === null ? "первый замер" : `${value.toFixed(2)}%`
}

function formatUptime(value: number): string {
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  const seconds = value % 60

  if (hours) return `${hours} ч ${minutes} мин`
  if (minutes) return `${minutes} мин ${seconds} с`
  return `${seconds} с`
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value))
}

function getMemoryPercent(item: iSharedSystem.RuntimeMetricsDto): number {
  return item.memory.systemTotalBytes
    ? Math.round(((item.memory.systemTotalBytes - item.memory.systemFreeBytes) / item.memory.systemTotalBytes) * 100)
    : 0
}

function getDiskPercent(item: iSharedSystem.RuntimeMetricsDto): number {
  return item.disk.totalBytes
    ? Math.round((item.disk.usedBytes / item.disk.totalBytes) * 100)
    : 0
}

function getLastLog(item: iSharedSystem.RuntimeMetricsDto): iSharedLogs.LogRecordDto | null {
  return item.logSummary.logs[0] || null
}

function getLogLevelClass(level: iSharedLogs.LogLevel | undefined): string {
  if (level === "error") return "text-red-600 dark:text-red-300"
  if (level === "warn") return "text-amber-600 dark:text-amber-300"
  return "text-slate-500 dark:text-slate-400"
}

function getLogCellClass(item: iSharedSystem.RuntimeMetricsDto): string {
  if (item.logSummary.errorCount) return "rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/70 dark:bg-red-950/30"
  if (item.logSummary.warnCount) return "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/70 dark:bg-amber-950/30"
  return "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/70 dark:bg-emerald-950/20"
}
</script>

<template>
  <section class="p-4 lg:p-6">
    <div class="mb-5 flex items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold text-slate-950 dark:text-slate-50">Состояние системы</h1>
      <button
        class="inline-flex min-h-9 items-center gap-2 rounded-md border border-blue-200 px-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
        type="button"
        :disabled="isLoading"
        @click="loadMetrics"
      >
        <RefreshCwIcon class="h-4 w-4" aria-hidden="true" />
        Обновить
      </button>
    </div>

    <div class="mb-4 grid gap-3 md:grid-cols-4">
      <div class="rounded-md border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <div class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Пакеты</div>
        <div class="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">{{ metrics.length }}</div>
      </div>
      <div class="rounded-md border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <div class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">В сети</div>
        <div class="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-300">{{ onlineCount }}</div>
      </div>
      <div class="rounded-md border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <div class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Недоступны</div>
        <div class="mt-1 text-2xl font-semibold text-red-600 dark:text-red-300">{{ unavailableCount }}</div>
      </div>
      <div class="rounded-md border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <div class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Логи</div>
        <div class="mt-1 flex items-baseline gap-3">
          <span class="text-2xl font-semibold text-amber-600 dark:text-amber-300">{{ warningCount }}</span>
          <span class="text-sm text-slate-500 dark:text-slate-400">предупреждений</span>
          <span class="text-2xl font-semibold text-red-600 dark:text-red-300">{{ errorCount }}</span>
          <span class="text-sm text-slate-500 dark:text-slate-400">ошибок</span>
        </div>
      </div>
    </div>

    <div v-if="errorMessage" class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" role="alert">
      {{ errorMessage }}
    </div>

    <div class="overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div class="grid grid-cols-[12rem_6rem_10rem_10rem_10rem_minmax(12rem,1fr)_minmax(16rem,1.1fr)_6.5rem] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        <span>Источник</span>
        <span>Статус</span>
        <span>CPU</span>
        <span>Память</span>
        <span>Диск</span>
        <span>Runtime</span>
        <span>Логи</span>
        <span></span>
      </div>

      <div v-if="isLoading" class="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Загрузка метрик
      </div>

      <div v-else-if="!metrics.length" class="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Нет подключенных сервисов и шлюзов
      </div>

      <div v-else class="divide-y divide-slate-200 dark:divide-slate-700">
        <article
          v-for="item in metrics"
          :key="item.packageUid"
          class="grid grid-cols-[12rem_6rem_10rem_10rem_10rem_minmax(12rem,1fr)_minmax(16rem,1.1fr)_6.5rem] gap-3 px-4 py-3 text-sm"
          :class="item.logSummary.errorCount ? 'bg-red-50/60 dark:bg-red-950/10' : item.logSummary.warnCount ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''"
        >
          <div class="min-w-0">
            <div class="truncate font-medium text-slate-950 dark:text-slate-50">{{ item.source }}</div>
            <div v-if="item.status === 'online'" class="text-xs text-slate-500 dark:text-slate-400">{{ item.packageKind }}</div>
          </div>

          <span>
            <span
              class="inline-flex rounded px-2 py-1 text-xs font-semibold"
              :class="item.status === 'online' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'"
            >
              {{ item.status === 'online' ? 'online' : 'unavailable' }}
            </span>
          </span>

          <div v-if="item.status === 'online'" class="text-slate-700 dark:text-slate-200">
            {{ formatPercent(item.cpu.usagePercent) }}
            <div class="text-xs text-slate-500 dark:text-slate-400">{{ item.cpu.cores }} ядер</div>
          </div>
          <div v-else class="text-slate-500 dark:text-slate-400">{{ item.reason }}</div>

          <div v-if="item.status === 'online'" class="text-slate-700 dark:text-slate-200">
            {{ getMemoryPercent(item) }}%
            <div class="text-xs text-slate-500 dark:text-slate-400">
              heap {{ formatBytes(item.memory.heapUsedBytes) }}
            </div>
          </div>
          <div v-else></div>

          <div v-if="item.status === 'online'" class="text-slate-700 dark:text-slate-200">
            {{ getDiskPercent(item) }}%
            <div class="text-xs text-slate-500 dark:text-slate-400">
              свободно {{ formatBytes(item.disk.freeBytes) }}
            </div>
          </div>
          <div v-else></div>

          <div v-if="item.status === 'online'" class="min-w-0 text-slate-700 dark:text-slate-200">
            <div>uptime {{ formatUptime(item.uptimeSeconds) }}</div>
            <div class="truncate text-xs text-slate-500 dark:text-slate-400">
              {{ item.hostname }} / {{ item.nodeVersion }} / {{ item.platform }}
            </div>
            <div class="truncate text-xs text-slate-500 dark:text-slate-400">
              IP {{ item.connectionIpAddress || "не определен" }}
            </div>
          </div>
          <div v-else></div>

          <div class="min-w-0 text-slate-700 dark:text-slate-200" :class="getLogCellClass(item)">
            <div class="mb-1 flex flex-wrap gap-2 text-xs">
              <span
                class="rounded px-2 py-0.5 font-semibold"
                :class="item.logSummary.warnCount ? 'bg-amber-200 text-amber-900 dark:bg-amber-900/80 dark:text-amber-100' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'"
              >
                warn {{ item.logSummary.warnCount }}
              </span>
              <span
                class="rounded px-2 py-0.5 font-semibold"
                :class="item.logSummary.errorCount ? 'bg-red-200 text-red-900 dark:bg-red-900/80 dark:text-red-100' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'"
              >
                error {{ item.logSummary.errorCount }}
              </span>
              <span
                v-if="!item.logSummary.warnCount && !item.logSummary.errorCount"
                class="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
              >
                без проблем
              </span>
            </div>
            <div v-if="getLastLog(item)" class="min-w-0">
              <div class="flex min-w-0 gap-1 text-xs text-slate-500 dark:text-slate-400">
                <span class="shrink-0 font-medium" :class="getLogLevelClass(getLastLog(item)?.level)">
                  {{ getLastLog(item)?.level }}
                </span>
                <span class="shrink-0">{{ formatTimestamp(getLastLog(item)?.timestamp || "") }}</span>
                <span class="truncate text-slate-600 dark:text-slate-300">{{ getLastLog(item)?.message }}</span>
              </div>
            </div>
            <div v-else class="text-xs text-slate-500 dark:text-slate-400">
              Логов пакета пока нет
            </div>
          </div>

          <div class="flex items-center gap-2">
            <router-link
              class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              :to="{ name: 'system-package-logs', params: { packageUid: item.packageUid }, query: { source: item.source } }"
              aria-label="Открыть логи пакета"
              title="Открыть логи пакета"
            >
              <ListTreeIcon class="h-4 w-4" aria-hidden="true" />
            </router-link>

            <button
              class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-blue-200 text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
              type="button"
              :disabled="updatingPackageUid === item.packageUid"
              aria-label="Обновить метрики пакета"
              title="Обновить метрики пакета"
              @click="loadMetric(item.packageUid)"
            >
              <RefreshCwIcon class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

