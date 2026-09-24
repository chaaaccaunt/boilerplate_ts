<script lang="ts" setup>
import { computed, ref, watch } from "vue"
import ModalHost from "@/application/providers/ModalHost.vue"
import { useApiClient } from "@/application/api"
import { ApiError } from "@/shared/api"
import PaginationControls from "@/shared/ui/PaginationControls.vue"

const props = defineProps<{
  modelValue: boolean
  currentUser: iSharedUser.PublicUserDto
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void
}>()

const apiClient = useApiClient()
const users = ref<iSharedUser.PublicUserDto[]>([])
const total = ref(0)
const offset = ref(0)
const pageSize = 25
const selectedUserUid = ref(props.currentUser.uid)
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref("")

const currentPage = computed(() => Math.floor(offset.value / pageSize) + 1)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const canTransfer = computed(() => Boolean(
  selectedUserUid.value &&
  selectedUserUid.value !== props.currentUser.uid &&
  !loading.value &&
  !saving.value
))

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) return

    selectedUserUid.value = props.currentUser.uid
    offset.value = 0
    errorMessage.value = ""
    loadUsers()
  }
)

function loadUsers(): void {
  loading.value = true
  errorMessage.value = ""

  apiClient.users.list({ limit: pageSize, offset: offset.value })
    .then((result) => {
      users.value = result.users
      total.value = result.total
      offset.value = result.offset
    })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error, "Не удалось загрузить пользователей")
    })
    .finally(() => {
      loading.value = false
    })
}

function changePage(page: number): void {
  const normalizedPage = Math.min(Math.max(page, 1), totalPages.value)
  offset.value = (normalizedPage - 1) * pageSize
  loadUsers()
}

function selectUser(userUid: string): void {
  selectedUserUid.value = userUid
}

function transfer(): void {
  if (!canTransfer.value) return

  saving.value = true
  errorMessage.value = ""

  apiClient.users.transferSuperadministrator({ userUid: selectedUserUid.value })
    .then(() => apiClient.authorization.logout())
    .then(() => {
      apiClient.commit("authorization/clearUser")
      window.location.assign("/login")
    })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error, "Не удалось передать права суперадминистратора")
    })
    .finally(() => {
      saving.value = false
    })
}

function close(): void {
  if (saving.value) return
  emit("update:modelValue", false)
}

function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message
  return defaultMessage
}
</script>

<template>
  <ModalHost
    :model-value="modelValue"
    labelled-by="superadministrator-transfer-modal-title"
    panel-class="flex max-h-[calc(100vh-2rem)] max-w-2xl flex-col overflow-hidden"
    :close-on-backdrop="!saving"
    :close-on-escape="!saving"
    @update:model-value="$event ? undefined : close()"
  >
    <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
      <h2 id="superadministrator-transfer-modal-title" class="text-lg font-semibold text-slate-950 dark:text-slate-50">
        Передача прав суперадминистратора
      </h2>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Выберите одного пользователя. После передачи текущая сессия будет завершена.
      </p>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
      <div v-if="errorMessage" class="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">
        {{ errorMessage }}
      </div>

      <div v-if="loading" class="py-6 text-center text-sm text-slate-600 dark:text-slate-300">
        Загрузка пользователей...
      </div>

      <div v-else class="grid gap-2">
        <label
          v-for="user in users"
          :key="user.uid"
          class="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <span class="min-w-0">
            <span class="block truncate text-sm font-medium text-slate-950 dark:text-slate-50">{{ user.fullName }}</span>
            <span class="block truncate text-xs text-slate-500 dark:text-slate-400">{{ user.login }}</span>
          </span>
          <input
            class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
            type="checkbox"
            :checked="selectedUserUid === user.uid"
            @change="selectUser(user.uid)"
          >
        </label>
      </div>

      <div v-if="total > pageSize" class="mt-4 grid justify-items-start gap-2 text-sm">
        <span class="text-slate-500 dark:text-slate-400">{{ currentPage }} / {{ totalPages }}</span>
        <PaginationControls :current-page="currentPage" :total-pages="totalPages" :disabled="loading" @change="changePage" />
      </div>
    </div>

    <div class="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700 sm:flex-row sm:justify-end">
      <button
        class="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        type="button"
        :disabled="saving"
        @click="close"
      >
        Отмена
      </button>
      <button
        class="inline-flex min-h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="!canTransfer"
        @click="transfer"
      >
        {{ saving ? "Передача..." : "Передать права" }}
      </button>
    </div>
  </ModalHost>
</template>
