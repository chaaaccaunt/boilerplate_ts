<script lang="ts" setup>
import { onMounted, ref } from "vue"
import { useApiClient } from "@/application/api"
import { ThemePreferenceControl } from "@/features/theme"

const apiClient = useApiClient()
const sessions = ref<iSharedAuthorization.UserSessionDto[]>([])
const loading = ref(false)
const actionSessionUid = ref<string | null>(null)
const revokeOthersLoading = ref(false)

onMounted(() => {
  loadSessions()
})

function loadSessions(): void {
  loading.value = true
  apiClient.authorization.listSessions()
    .then((result) => {
      sessions.value = result.sessions
    })
    .finally(() => {
      loading.value = false
    })
}

function revokeSession(session: iSharedAuthorization.UserSessionDto): void {
  actionSessionUid.value = session.uid
  apiClient.authorization.revokeSession({ sessionUid: session.uid })
    .then(() => {
      if (session.isCurrent) {
        apiClient.commit("authorization/clearUser")
        window.location.assign("/login")
        return
      }

      loadSessions()
    })
    .finally(() => {
      actionSessionUid.value = null
    })
}

function revokeOtherSessions(): void {
  revokeOthersLoading.value = true
  apiClient.authorization.revokeOtherSessions()
    .then(() => loadSessions())
    .finally(() => {
      revokeOthersLoading.value = false
    })
}

function getSessionTitle(session: iSharedAuthorization.UserSessionDto): string {
  return `${getDeviceTypeLabel(session.deviceType)} · ${session.operatingSystem} · ${session.browser}`
}

function getDeviceTypeLabel(value: string): string {
  if (value === "mobile") return "Телефон"
  if (value === "tablet") return "Планшет"
  if (value === "desktop") return "Компьютер"

  return "Устройство"
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value))
}
</script>

<template>
  <section class="min-h-[calc(100vh-57px)] p-4 lg:p-6">
    <div class="mb-5">
      <h1 class="text-2xl font-semibold text-slate-950 dark:text-slate-50">Настройки</h1>
    </div>

    <div class="max-w-3xl rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Оформление</h2>
      </div>

      <div class="px-5 py-4">
        <ThemePreferenceControl />
      </div>
    </div>

    <div class="mt-5 max-w-3xl rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div class="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Устройства и сессии</h2>
        <button
          class="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
          type="button"
          :disabled="revokeOthersLoading || loading"
          @click="revokeOtherSessions"
        >
          Выйти со всех остальных
        </button>
      </div>

      <div class="divide-y divide-slate-200 dark:divide-slate-700">
        <div v-if="loading" class="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
          Загрузка сессий...
        </div>

        <div v-else-if="!sessions.length" class="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
          Активные сессии не найдены.
        </div>

        <template v-else>
          <div
            v-for="session in sessions"
            :key="session.uid"
            class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-sm font-medium text-slate-950 dark:text-slate-50">
                  {{ getSessionTitle(session) }}
                </p>
                <span
                  v-if="session.isCurrent"
                  class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                >
                  Текущая
                </span>
              </div>
              <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
                IP: {{ session.ipAddress || "не определен" }}
              </p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Последняя активность: {{ formatDate(session.lastSeenAt) }}
              </p>
            </div>

            <button
              class="inline-flex items-center justify-center rounded-md border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-500/10"
              type="button"
              :disabled="actionSessionUid === session.uid"
              @click="revokeSession(session)"
            >
              Выйти
            </button>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>
