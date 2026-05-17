<script lang="ts" setup>
import { computed, ref } from "vue"
import { PlusIcon, SaveIcon, Trash2Icon } from "@lucide/vue"
import { useApiClient } from "@/application/api"
import { ApiError } from "@/shared/api"

const props = defineProps<{
  roles: iSharedUserRole.UserRoleDto[]
}>()

const apiClient = useApiClient()

const newRoleName = ref("")
const editedRoleUid = ref<string | null>(null)
const editedRoleName = ref("")
const isSubmitting = ref(false)
const errorMessage = ref("")

const canCreate = computed(() => Boolean(newRoleName.value.trim() && !isSubmitting.value))

function isSystemRole(role: iSharedUserRole.UserRoleDto): boolean {
  return role.name === "administrator" || role.name === "user"
}

function createRole(): void {
  if (!canCreate.value) return

  isSubmitting.value = true
  errorMessage.value = ""

  apiClient.users.createRole({ name: newRoleName.value.trim() })
    .then(() => {
      newRoleName.value = ""
    })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось создать роль"
    })
    .finally(() => {
      isSubmitting.value = false
    })
}

function startEdit(role: iSharedUserRole.UserRoleDto): void {
  if (isSystemRole(role)) return
  editedRoleUid.value = role.uid
  editedRoleName.value = role.name
  errorMessage.value = ""
}

function saveRole(role: iSharedUserRole.UserRoleDto): void {
  if (!editedRoleName.value.trim() || isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = ""

  apiClient.users.updateRole({
    uid: role.uid,
    name: editedRoleName.value.trim()
  })
    .then(() => {
      editedRoleUid.value = null
      editedRoleName.value = ""
    })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось обновить роль"
    })
    .finally(() => {
      isSubmitting.value = false
    })
}

function deleteRole(role: iSharedUserRole.UserRoleDto): void {
  if (isSystemRole(role) || isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = ""

  apiClient.users.deleteRole({ uid: role.uid })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось удалить роль"
    })
    .finally(() => {
      isSubmitting.value = false
    })
}
</script>

<template>
  <section class="mb-5 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
    <div class="mb-3 flex items-center justify-between gap-3">
      <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Роли</h2>
    </div>

    <div v-if="errorMessage" class="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {{ errorMessage }}
    </div>

    <form class="mb-3 flex gap-2" @submit.prevent="createRole">
      <input
        v-model="newRoleName"
        class="h-10 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950"
        type="text"
        placeholder="new_role"
      >
      <button
        class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        :disabled="!canCreate"
        aria-label="Создать роль"
      >
        <PlusIcon class="h-4 w-4" aria-hidden="true" />
      </button>
    </form>

    <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="role in props.roles"
        :key="role.uid"
        class="flex min-h-10 min-w-0 items-center gap-2 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700"
      >
        <input
          v-if="editedRoleUid === role.uid"
          v-model="editedRoleName"
          class="h-9 min-w-0 flex-1 rounded-md border border-slate-300 px-2 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950"
          type="text"
        >
        <button
          v-else
          class="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-700 dark:text-slate-200"
          type="button"
          :disabled="isSystemRole(role)"
          @click="startEdit(role)"
        >
          {{ role.name }}
        </button>

        <button
          v-if="editedRoleUid === role.uid"
          class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-300 dark:hover:bg-blue-950"
          type="button"
          :disabled="isSubmitting"
          :aria-label="`Сохранить роль ${role.name}`"
          @click="saveRole(role)"
        >
          <SaveIcon class="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/40"
          type="button"
          :disabled="isSubmitting || isSystemRole(role)"
          :aria-label="`Удалить роль ${role.name}`"
          @click="deleteRole(role)"
        >
          <Trash2Icon class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  </section>
</template>
