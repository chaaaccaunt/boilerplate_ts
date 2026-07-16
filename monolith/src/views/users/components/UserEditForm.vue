<script lang="ts" setup>
import { computed, ref, watch } from "vue"
import { SaveIcon } from "@lucide/vue"
import { useApiClient } from "@/application/api"
import { ApiError } from "@/shared/api"

const props = defineProps<{
  user: iSharedUser.PublicUserDto
  roles: iSharedUserRole.UserRoleDto[]
}>()

const emit = defineEmits<{
  (event: "updated"): void
}>()

const apiClient = useApiClient()

const login = ref("")
const firstName = ref("")
const lastName = ref("")
const surname = ref("")
const selectedRoleNames = ref<iSharedUserRole.UserRoleName[]>([])
const isSubmitting = ref(false)
const errorMessage = ref("")

const canSubmit = computed(() => Boolean(
  login.value.trim() &&
  firstName.value.trim() &&
  lastName.value.trim() &&
  selectedRoleNames.value.length &&
  !isSubmitting.value
))

watch(
  () => props.user,
  (user) => {
    login.value = user.login
    firstName.value = user.firstName
    lastName.value = user.lastName
    surname.value = user.surname || ""
    selectedRoleNames.value = user.roles.map((role) => role.name)
    errorMessage.value = ""
  },
  { immediate: true }
)

function updateUser(): void {
  if (!canSubmit.value) return

  isSubmitting.value = true
  errorMessage.value = ""

  apiClient.users.update({
    uid: props.user.uid,
    login: login.value.trim(),
    firstName: firstName.value.trim(),
    lastName: lastName.value.trim(),
    surname: surname.value.trim() || undefined,
    roleNames: selectedRoleNames.value
  })
    .then(() => {
      emit("updated")
    })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось обновить пользователя"
    })
    .finally(() => {
      isSubmitting.value = false
    })
}
</script>

<template>
  <form class="max-h-[calc(92vh-4.5rem)] overflow-y-auto px-5 py-4" @submit.prevent="updateUser">
    <div v-if="errorMessage" class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {{ errorMessage }}
    </div>

    <div class="mb-4">
      <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" for="edit-user-login">Логин</label>
      <input id="edit-user-login" v-model="login" class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950" type="email" required>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" for="edit-user-last-name">Фамилия</label>
        <input id="edit-user-last-name" v-model="lastName" class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950" type="text" required>
      </div>
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" for="edit-user-first-name">Имя</label>
        <input id="edit-user-first-name" v-model="firstName" class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950" type="text" required>
      </div>
    </div>

    <div class="my-4">
      <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" for="edit-user-surname">Отчество</label>
      <input id="edit-user-surname" v-model="surname" class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950" type="text">
    </div>

    <div class="mb-5">
      <div class="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Роли</div>
      <div class="grid gap-2 rounded-md border border-slate-300 p-3 dark:border-slate-700 dark:bg-slate-950">
        <label
          v-for="role in roles"
          :key="role.uid"
          class="flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <input
            v-model="selectedRoleNames"
            class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
            type="checkbox"
            :value="role.name"
          >
          <span>{{ role.name }}</span>
        </label>
      </div>
    </div>

    <button
      class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      type="submit"
      :disabled="!canSubmit"
    >
      <SaveIcon class="h-4 w-4" aria-hidden="true" />
      {{ isSubmitting ? "Сохранение..." : "Сохранить" }}
    </button>
  </form>
</template>
