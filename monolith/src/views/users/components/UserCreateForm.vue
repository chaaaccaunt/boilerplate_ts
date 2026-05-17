<script lang="ts" setup>
import { computed, ref } from "vue"
import { PlusIcon } from "@lucide/vue"
import { useApiClient } from "@/application/api"
import { ApiError } from "@/shared/api"

defineProps<{
  roles: iSharedUserRole.UserRoleDto[]
}>()

const emit = defineEmits<{
  (event: "created"): void
}>()

const apiClient = useApiClient()

const login = ref("")
const password = ref("")
const firstName = ref("")
const lastName = ref("")
const surname = ref("")
const selectedRoleNames = ref<iSharedUserRole.UserRoleName[]>(["user"])
const isSubmitting = ref(false)
const errorMessage = ref("")

const canSubmit = computed(() => Boolean(
  login.value.trim() &&
  password.value.length >= 8 &&
  firstName.value.trim() &&
  lastName.value.trim() &&
  selectedRoleNames.value.length &&
  !isSubmitting.value
))

function createUser(): void {
  if (!canSubmit.value) return

  isSubmitting.value = true
  errorMessage.value = ""

  apiClient.users.create({
    login: login.value.trim(),
    password: password.value,
    firstName: firstName.value.trim(),
    lastName: lastName.value.trim(),
    surname: surname.value.trim() || undefined,
    roleNames: selectedRoleNames.value
  })
    .then(() => {
      login.value = ""
      password.value = ""
      firstName.value = ""
      lastName.value = ""
      surname.value = ""
      selectedRoleNames.value = ["user"]
      emit("created")
    })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось создать пользователя"
    })
    .finally(() => {
      isSubmitting.value = false
    })
}
</script>

<template>
  <form class="px-5 py-4" @submit.prevent="createUser">
    <div v-if="errorMessage" class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {{ errorMessage }}
    </div>

    <div class="mb-4">
      <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" for="user-login">Логин</label>
      <input id="user-login" v-model="login" class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950" type="email" required>
    </div>

    <div class="mb-4">
      <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" for="user-password">Пароль</label>
      <input id="user-password" v-model="password" class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950" type="password" minlength="8" required>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" for="user-last-name">Фамилия</label>
        <input id="user-last-name" v-model="lastName" class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950" type="text" required>
      </div>
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" for="user-first-name">Имя</label>
        <input id="user-first-name" v-model="firstName" class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950" type="text" required>
      </div>
    </div>

    <div class="my-4">
      <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" for="user-surname">Отчество</label>
      <input id="user-surname" v-model="surname" class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950" type="text">
    </div>

    <div class="mb-5">
      <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" for="user-roles">Роли</label>
      <select id="user-roles" v-model="selectedRoleNames" class="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950" multiple required>
        <option v-for="role in roles" :key="role.uid" :value="role.name">
          {{ role.name }}
        </option>
      </select>
    </div>

    <button
      class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      type="submit"
      :disabled="!canSubmit"
    >
      <PlusIcon class="h-4 w-4" aria-hidden="true" />
      {{ isSubmitting ? "Создание..." : "Создать" }}
    </button>
  </form>
</template>
