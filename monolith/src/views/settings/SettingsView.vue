<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from "vue"
import { useApiClient } from "@/application/api"
import { useStore } from "@/application/store"
import { ApiError } from "@/shared/api"
import { ThemePreferenceControl } from "@/features/theme"

const apiClient = useApiClient()
const store = useStore()
const sessions = ref<iSharedAuthorization.UserSessionDto[]>([])
const loading = ref(false)
const actionSessionUid = ref<string | null>(null)
const revokeOthersLoading = ref(false)
const serviceTokenActionUid = ref<string | null>(null)
const serviceTokenErrorMessage = ref("")
const serviceTokenLoading = ref(false)
const serviceTokenSaving = ref(false)
const superadministratorSaving = ref(false)
const superadministratorErrorMessage = ref("")
const editingServiceTokenUid = ref<string | null>(null)
const selectedSuperadministratorUids = ref<string[]>([])
const serviceTokenForm = reactive({
  type: "social_network" as iSharedServiceToken.ServiceTokenType,
  serviceName: "",
  displayName: "",
  token: "",
  isEnabled: true
})

const currentUser = computed(() => store.state.authorization.user)
const isSuperadministrator = computed(() => Boolean(currentUser.value?.roles.some((role) => role.name === "superadministrator")))
const users = computed(() => store.state.users.users)
const serviceTokens = computed(() => store.state.serviceTokens.tokens)

onMounted(() => {
  loadSessions()

  if (isSuperadministrator.value) {
    loadSuperadministratorSettings()
  }
})

watch(users, syncSuperadministratorSelection, { immediate: true })

function loadSuperadministratorSettings(): void {
  serviceTokenLoading.value = true
  serviceTokenErrorMessage.value = ""
  superadministratorErrorMessage.value = ""

  Promise.all([
    apiClient.users.list(),
    apiClient.serviceTokens.list()
  ])
    .catch((error) => {
      serviceTokenErrorMessage.value = getErrorMessage(error, "Не удалось загрузить настройки суперадминистратора")
    })
    .finally(() => {
      serviceTokenLoading.value = false
    })
}

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

function saveServiceToken(): void {
  serviceTokenSaving.value = true
  serviceTokenErrorMessage.value = ""

  const request = editingServiceTokenUid.value
    ? apiClient.serviceTokens.update({
      uid: editingServiceTokenUid.value,
      type: serviceTokenForm.type,
      serviceName: serviceTokenForm.serviceName,
      displayName: serviceTokenForm.displayName,
      token: serviceTokenForm.token.trim() || undefined,
      isEnabled: serviceTokenForm.isEnabled
    })
    : apiClient.serviceTokens.create({
      type: serviceTokenForm.type,
      serviceName: serviceTokenForm.serviceName,
      displayName: serviceTokenForm.displayName,
      token: serviceTokenForm.token,
      isEnabled: serviceTokenForm.isEnabled
    })

  request
    .then(() => resetServiceTokenForm())
    .catch((error) => {
      serviceTokenErrorMessage.value = getErrorMessage(error, "Не удалось сохранить токен")
    })
    .finally(() => {
      serviceTokenSaving.value = false
    })
}

function editServiceToken(token: iSharedServiceToken.ServiceTokenDto): void {
  editingServiceTokenUid.value = token.uid
  serviceTokenForm.type = token.type
  serviceTokenForm.serviceName = token.serviceName
  serviceTokenForm.displayName = token.displayName
  serviceTokenForm.token = ""
  serviceTokenForm.isEnabled = token.isEnabled
}

function deleteServiceToken(token: iSharedServiceToken.ServiceTokenDto): void {
  serviceTokenActionUid.value = token.uid
  serviceTokenErrorMessage.value = ""

  apiClient.serviceTokens.delete({ uid: token.uid })
    .catch((error) => {
      serviceTokenErrorMessage.value = getErrorMessage(error, "Не удалось удалить токен")
    })
    .finally(() => {
      serviceTokenActionUid.value = null
    })
}

function resetServiceTokenForm(): void {
  editingServiceTokenUid.value = null
  serviceTokenForm.type = "social_network"
  serviceTokenForm.serviceName = ""
  serviceTokenForm.displayName = ""
  serviceTokenForm.token = ""
  serviceTokenForm.isEnabled = true
}

function toggleSuperadministrator(userUid: string): void {
  if (selectedSuperadministratorUids.value.includes(userUid)) {
    selectedSuperadministratorUids.value = selectedSuperadministratorUids.value.filter((uid) => uid !== userUid)
    return
  }

  selectedSuperadministratorUids.value = selectedSuperadministratorUids.value.concat(userUid)
}

function saveSuperadministrators(): void {
  if (!selectedSuperadministratorUids.value.length) {
    superadministratorErrorMessage.value = "Нужен хотя бы один суперадминистратор"
    return
  }

  superadministratorSaving.value = true
  superadministratorErrorMessage.value = ""

  apiClient.users.updateSuperadministratorUsers({ userUids: selectedSuperadministratorUids.value })
    .then(() => {
      if (currentUser.value && !selectedSuperadministratorUids.value.includes(currentUser.value.uid)) {
        return apiClient.authorization.logout()
          .then(() => {
            apiClient.commit("authorization/clearUser")
            window.location.assign("/login")
          })
      }

      return undefined
    })
    .catch((error) => {
      superadministratorErrorMessage.value = getErrorMessage(error, "Не удалось обновить суперадминистраторов")
    })
    .finally(() => {
      superadministratorSaving.value = false
    })
}

function syncSuperadministratorSelection(): void {
  selectedSuperadministratorUids.value = users.value
    .filter((user) => user.roles.some((role) => role.name === "superadministrator"))
    .map((user) => user.uid)
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

function getServiceTokenTypeLabel(value: iSharedServiceToken.ServiceTokenType): string {
  const labels: Record<iSharedServiceToken.ServiceTokenType, string> = {
    service: "Сервис",
    messenger: "Мессенджер",
    social_network: "Соцсеть"
  }

  return labels[value]
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
    <div class="mx-auto max-w-7xl space-y-5">
      <header>
        <h1 class="text-2xl font-semibold">Настройки</h1>
      </header>

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
          <h2 class="text-base font-semibold">Токены сервисов</h2>
        </div>

        <div class="grid gap-5 px-5 py-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <form class="grid h-fit gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40" @submit.prevent="saveServiceToken">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200" for="service-token-type">Тип</label>
              <select id="service-token-type" v-model="serviceTokenForm.type" class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50">
                <option value="social_network">Соцсеть</option>
                <option value="messenger">Мессенджер</option>
                <option value="service">Сервис</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200" for="service-token-name">Системное имя</label>
              <input id="service-token-name" v-model.trim="serviceTokenForm.serviceName" class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50" required pattern="[a-z][a-z0-9_-]{1,79}" placeholder="telegram_bot" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200" for="service-token-display-name">Название</label>
              <input id="service-token-display-name" v-model.trim="serviceTokenForm.displayName" class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50" required maxlength="120" placeholder="Telegram bot" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200" for="service-token-value">Токен</label>
              <textarea id="service-token-value" v-model="serviceTokenForm.token" class="min-h-[104px] w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50" :required="!editingServiceTokenUid" maxlength="4096" :placeholder="editingServiceTokenUid ? 'Оставьте пустым, чтобы не менять' : 'Вставьте токен'"></textarea>
            </div>
            <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input v-model="serviceTokenForm.isEnabled" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600" type="checkbox" />
              Включен
            </label>
            <div class="flex flex-wrap gap-2 pt-1">
              <button class="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white" type="submit" :disabled="serviceTokenSaving">
                {{ editingServiceTokenUid ? "Сохранить" : "Добавить" }}
              </button>
              <button v-if="editingServiceTokenUid" class="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800" type="button" @click="resetServiceTokenForm">
                Отмена
              </button>
            </div>
          </form>

          <div class="min-w-0">
            <div v-if="serviceTokenErrorMessage" class="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">
              {{ serviceTokenErrorMessage }}
            </div>

            <div v-if="serviceTokenLoading" class="flex min-h-[260px] items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              Загрузка токенов...
            </div>

            <div v-else-if="!serviceTokens.length" class="flex min-h-[260px] items-center justify-center rounded-md border border-dashed border-slate-300 px-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Токены еще не добавлены.
            </div>

            <div v-else class="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
              <table class="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
                  <tr>
                    <th class="px-3 py-2">Сервис</th>
                    <th class="px-3 py-2">Тип</th>
                    <th class="px-3 py-2">Токен</th>
                    <th class="px-3 py-2">Статус</th>
                    <th class="px-3 py-2 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
                  <tr v-for="token in serviceTokens" :key="token.uid">
                    <td class="px-3 py-2">
                      <div class="font-medium text-slate-950 dark:text-slate-50">{{ token.displayName }}</div>
                      <div class="text-xs text-slate-500 dark:text-slate-400">{{ token.serviceName }}</div>
                    </td>
                    <td class="px-3 py-2 text-slate-600 dark:text-slate-300">{{ getServiceTokenTypeLabel(token.type) }}</td>
                    <td class="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{{ token.tokenPreview }}</td>
                    <td class="px-3 py-2">
                      <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="token.isEnabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'">
                        {{ token.isEnabled ? "Включен" : "Отключен" }}
                      </span>
                    </td>
                    <td class="px-3 py-2">
                      <div class="flex justify-end gap-2">
                        <button class="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" type="button" @click="editServiceToken(token)">
                          Изменить
                        </button>
                        <button class="rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-500/10" type="button" :disabled="serviceTokenActionUid === token.uid" @click="deleteServiceToken(token)">
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-5 xl:grid-cols-2">
        <div v-if="isSuperadministrator" class="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <h2 class="text-base font-semibold">Передача прав суперадминистратора</h2>
          </div>

          <div class="px-5 py-4">
            <div v-if="superadministratorErrorMessage" class="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">
              {{ superadministratorErrorMessage }}
            </div>

            <div class="grid gap-2">
              <label v-for="user in users" :key="user.uid" class="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700">
                <span class="min-w-0">
                  <span class="block truncate text-sm font-medium text-slate-950 dark:text-slate-50">{{ user.fullName }}</span>
                  <span class="block truncate text-xs text-slate-500 dark:text-slate-400">{{ user.login }}</span>
                </span>
                <input class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600" type="checkbox" :checked="selectedSuperadministratorUids.includes(user.uid)" @change="toggleSuperadministrator(user.uid)" />
              </label>
            </div>

            <button class="mt-4 inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white" type="button" :disabled="superadministratorSaving || !selectedSuperadministratorUids.length" @click="saveSuperadministrators">
              Сохранить суперадминистраторов
            </button>
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
        </div>
      </div>
    </div>
  </section>
</template>
