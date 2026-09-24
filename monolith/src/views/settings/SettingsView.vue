<script lang="ts" setup>
import { computed, onMounted, ref } from "vue"
import { useApiClient } from "@/application/api"
import { useStore } from "@/application/store"
import { ApiError } from "@/shared/api"
import PaginationControls from "@/shared/ui/PaginationControls.vue"
import { ThemePreferenceControl } from "@/features/theme"
import SuperadministratorTransferModal from "./components/SuperadministratorTransferModal.vue"

const apiClient = useApiClient()
const store = useStore()
const sessions = ref<iSharedAuthorization.UserSessionDto[]>([])
const sessionsTotal = ref(0)
const sessionsOffset = ref(0)
const sessionsPageSize = 10
const loading = ref(false)
const actionSessionUid = ref<string | null>(null)
const revokeOthersLoading = ref(false)
const isSuperadministratorTransferModalOpen = ref(false)
const maxStatus = ref<iSharedNotifications.MaxAccountStatusDto>({ linked: false, twoFactorEnabled: false, maxDisplayName: null, botAvailable: false })
const maxLink = ref<iSharedNotifications.MaxLinkCodeResponseDto | null>(null)
const maxBotStatus = ref<iSharedNotifications.MaxBotStatusDto>({ configured: false, running: false, botUsername: null, updatedAt: null })
const maxBotToken = ref("")
const maxBotLoading = ref(false)
const maxBotErrorMessage = ref("")
const maxBotSuccessMessage = ref("")

const currentUser = computed(() => store.state.authorization.user)
const isSuperadministrator = computed(() => Boolean(currentUser.value?.roles.some((role) => role.name === "superadministrator")))
const sessionsPage = computed(() => Math.floor(sessionsOffset.value / sessionsPageSize) + 1)
const sessionsTotalPages = computed(() => Math.max(1, Math.ceil(sessionsTotal.value / sessionsPageSize)))

onMounted(() => {
  loadSessions()
  loadMaxStatus()
  if (isSuperadministrator.value) loadMaxBotStatus()
})

function loadMaxStatus(): void { apiClient.notifications.maxStatus().then((result) => { maxStatus.value = result }) }
function loadMaxBotStatus(): void { apiClient.notifications.maxBotStatus().then((result) => { maxBotStatus.value = result }) }
function createMaxLinkCode(): void { apiClient.notifications.createMaxLinkCode().then((result) => { maxLink.value = result }) }
function unlinkMax(): void { apiClient.notifications.unlinkMax().then(() => { maxLink.value = null; loadMaxStatus() }) }
function setTwoFactor(enabled: boolean): void { apiClient.notifications.setTwoFactor(enabled).then((result) => { maxStatus.value = result }) }

function configureMaxBot(): void {
  const token = maxBotToken.value.trim()
  maxBotErrorMessage.value = ""
  maxBotSuccessMessage.value = ""

  if (!token) {
    maxBotErrorMessage.value = "Введите токен MAX-бота"
    return
  }

  maxBotLoading.value = true
  apiClient.notifications.configureMaxBot(token)
    .then((result) => {
      maxBotStatus.value = result
      maxBotToken.value = ""
      maxBotSuccessMessage.value = `MAX-бот @${result.botUsername || "без имени"} запущен`
      loadMaxStatus()
    })
    .catch((error) => {
      maxBotErrorMessage.value = getErrorMessage(error, "Не удалось запустить MAX-бота")
    })
    .finally(() => {
      maxBotLoading.value = false
    })
}

function loadSessions(offset = sessionsOffset.value): void {
  loading.value = true
  apiClient.authorization.listSessions({ limit: sessionsPageSize, offset })
    .then((result) => {
      sessions.value = result.sessions
      sessionsTotal.value = result.total
      sessionsOffset.value = result.offset
    })
    .finally(() => {
      loading.value = false
    })
}

function changeSessionsPage(page: number): void {
  const normalizedPage = Math.min(Math.max(page, 1), sessionsTotalPages.value)
  loadSessions((normalizedPage - 1) * sessionsPageSize)
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

function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message
  return defaultMessage
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value))
}
</script>

<template>
  <section class="min-h-[calc(100vh-57px)] bg-slate-50 p-4 text-slate-950 dark:bg-slate-950 dark:text-slate-50 lg:p-6">
    <div class="w-full space-y-5">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 class="text-2xl font-semibold">Настройки</h1>
        <button
          v-if="isSuperadministrator"
          class="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
          type="button"
          @click="isSuperadministratorTransferModalOpen = true"
        >
          Передать права суперадминистратора
        </button>
      </header>

      <div class="grid gap-5 xl:grid-cols-2">
        <div class="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <h2 class="text-base font-semibold">Оформление</h2>
          </div>

          <div class="px-5 py-4">
            <ThemePreferenceControl />
          </div>
        </div>

        <div v-if="isSuperadministrator" class="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <h2 class="text-base font-semibold">MAX-бот</h2>
          </div>
          <form class="space-y-4 px-5 py-4" @submit.prevent="configureMaxBot">
            <div>
              <p class="text-sm text-slate-600 dark:text-slate-300">
                <template v-if="maxBotStatus.running">Запущен: @{{ maxBotStatus.botUsername }}</template>
                <template v-else-if="maxBotStatus.configured">Настроен, но сейчас не запущен</template>
                <template v-else>Не настроен</template>
              </p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Токен сохраняется на сервере и не отображается после сохранения.</p>
            </div>
            <label class="block">
              <span class="mb-1 block text-sm font-medium">Токен бота</span>
              <input
                v-model="maxBotToken"
                class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-950"
                type="password"
                autocomplete="off"
                placeholder="Вставьте токен MAX Bot API"
              >
            </label>
            <p v-if="maxBotErrorMessage" class="text-sm text-rose-600 dark:text-rose-300">{{ maxBotErrorMessage }}</p>
            <p v-if="maxBotSuccessMessage" class="text-sm text-emerald-600 dark:text-emerald-300">{{ maxBotSuccessMessage }}</p>
            <button
              class="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950"
              type="submit"
              :disabled="maxBotLoading || !maxBotToken.trim()"
            >
              {{ maxBotLoading ? 'Подключение...' : (maxBotStatus.configured ? 'Заменить токен и перезапустить' : 'Сохранить и запустить') }}
            </button>
          </form>
        </div>

        <div class="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700"><h2 class="text-base font-semibold">MAX и двухфакторная защита</h2></div>
          <div class="space-y-4 px-5 py-4">
            <template v-if="maxStatus.linked">
              <p class="text-sm text-slate-600 dark:text-slate-300">Привязан: {{ maxStatus.maxDisplayName || 'аккаунт MAX' }}</p>
              <label class="flex items-center gap-2 text-sm"><input type="checkbox" :checked="maxStatus.twoFactorEnabled" @change="setTwoFactor(($event.target as HTMLInputElement).checked)"> Запрашивать код из MAX при входе</label>
              <button class="rounded-md border border-rose-300 px-3 py-2 text-sm text-rose-700 dark:border-rose-700 dark:text-rose-300" type="button" @click="unlinkMax">Отвязать MAX</button>
            </template>
            <template v-else>
              <p class="text-sm text-slate-600 dark:text-slate-300">Привяжите MAX, чтобы получать уведомления и при необходимости включить 2FA.</p>
              <p v-if="!maxStatus.botAvailable" class="text-sm text-amber-700 dark:text-amber-300">MAX-бот ещё не запущен администратором.</p>
              <button class="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950" type="button" :disabled="!maxStatus.botAvailable" @click="createMaxLinkCode">Получить ссылку привязки</button>
              <div v-if="maxLink" class="rounded-md bg-slate-100 p-3 dark:bg-slate-800">
                <p class="text-sm">Откройте ссылку, чтобы перейти к боту и подтвердить привязку аккаунта.</p>
                <a class="mt-3 inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500" :href="maxLink.link" target="_blank" rel="noopener noreferrer">Открыть MAX</a>
                <p class="mt-2 break-all text-xs text-slate-500 dark:text-slate-400">{{ maxLink.link }}</p>
              </div>
            </template>
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
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
        <div v-if="sessionsTotal > sessionsPageSize" class="grid justify-items-start gap-2 border-t border-slate-200 px-5 py-3 text-sm dark:border-slate-700">
          <span class="text-slate-500 dark:text-slate-400">{{ sessionsPage }} / {{ sessionsTotalPages }}</span>
          <PaginationControls :current-page="sessionsPage" :total-pages="sessionsTotalPages" :disabled="loading" @change="changeSessionsPage" />
        </div>
      </div>

      <SuperadministratorTransferModal
        v-if="currentUser"
        v-model="isSuperadministratorTransferModalOpen"
        :current-user="currentUser"
      />
    </div>
  </section>
</template>
