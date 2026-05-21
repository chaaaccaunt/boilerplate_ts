<script lang="ts" setup>
import { computed, onMounted, ref } from "vue"
import { RefreshCwIcon } from "@lucide/vue"
import { useApiClient } from "@/application/api"
import { useStore } from "@/application/store"
import { ApiError } from "@/shared/api"

const apiClient = useApiClient()
const store = useStore()

const isLoading = ref(false)
const updatingPackageUid = ref<string | null>(null)
const errorMessage = ref("")
const metrics = computed(() => store.state.system.metrics)

onMounted(() => {
  loadMetrics()
})

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
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось обновить метрики package"
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

    <div v-if="errorMessage" class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" role="alert">
      {{ errorMessage }}
    </div>

    <div class="overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div class="grid grid-cols-[12rem_7rem_9rem_12rem_12rem_minmax(16rem,1fr)_3rem] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        <span>Источник</span>
        <span>Статус</span>
        <span>CPU</span>
        <span>Память</span>
        <span>Диск</span>
        <span>Runtime</span>
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
          class="grid grid-cols-[12rem_7rem_9rem_12rem_12rem_minmax(16rem,1fr)_3rem] gap-3 px-4 py-3 text-sm"
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
            нагрузка {{ formatPercent(item.cpu.usagePercent) }}
            <div class="text-xs text-slate-500 dark:text-slate-400">{{ item.cpu.cores }} cores</div>
          </div>
          <div v-else class="text-slate-500 dark:text-slate-400">{{ item.reason }}</div>

          <div v-if="item.status === 'online'" class="text-slate-700 dark:text-slate-200">
            занято {{ getMemoryPercent(item) }}%
            <div class="text-xs text-slate-500 dark:text-slate-400">
              heap {{ formatBytes(item.memory.heapUsedBytes) }}
            </div>
          </div>
          <div v-else></div>

          <div v-if="item.status === 'online'" class="text-slate-700 dark:text-slate-200">
            занято {{ getDiskPercent(item) }}%
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

          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-blue-200 text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
            type="button"
            :disabled="updatingPackageUid === item.packageUid"
            aria-label="Обновить метрики package"
            @click="loadMetric(item.packageUid)"
          >
            <RefreshCwIcon class="h-4 w-4" aria-hidden="true" />
          </button>
        </article>
      </div>
    </div>
  </section>
</template>

