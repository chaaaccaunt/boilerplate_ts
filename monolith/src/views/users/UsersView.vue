<script lang="ts" setup>
import { computed, onMounted, ref } from "vue"
import { RefreshCwIcon } from "@lucide/vue"
import { useApiClient } from "@/application/api"
import { useStore } from "@/application/store"
import { ApiError } from "@/shared/api"
import UserCreateForm from "./components/UserCreateForm.vue"
import UsersTable from "./components/UsersTable.vue"

const apiClient = useApiClient()
const store = useStore()

const isLoading = ref(false)
const errorMessage = ref("")

const users = computed(() => store.state.users.users)
const roles = computed(() => store.state.users.roles)

onMounted(() => {
  loadUsers()
})

function loadUsers(): void {
  isLoading.value = true
  errorMessage.value = ""

  Promise.all([
    apiClient.users.list(),
    apiClient.users.listRoles()
  ])
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось загрузить пользователей"
    })
    .finally(() => {
      isLoading.value = false
    })
}
</script>

<template>
  <section class="p-4 lg:p-6">
    <div class="mb-5 flex items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold text-slate-950">Пользователи</h1>
      <button
        class="inline-flex min-h-9 items-center gap-2 rounded-md border border-blue-200 px-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="isLoading"
        @click="loadUsers"
      >
        <RefreshCwIcon class="h-4 w-4" aria-hidden="true" />
        Обновить
      </button>
    </div>

    <div v-if="errorMessage" class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {{ errorMessage }}
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
      <UserCreateForm :roles="roles" />
      <UsersTable :users="users" />
    </div>
  </section>
</template>
