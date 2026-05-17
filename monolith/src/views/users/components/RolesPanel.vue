<script lang="ts" setup>
import { computed, ref } from "vue"
import { LockIcon, PencilIcon, PlusIcon, SaveIcon, ShieldIcon, Trash2Icon, XIcon } from "@lucide/vue"
import { useApiClient } from "@/application/api"
import ModalHost from "@/application/providers/ModalHost.vue"
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
const isModalOpen = ref(false)

const canCreate = computed(() => Boolean(newRoleName.value.trim() && !isSubmitting.value))
const customRolesCount = computed(() => props.roles.filter((role) => !isSystemRole(role)).length)
const sortedRoles = computed(() => props.roles.slice().sort((firstRole, secondRole) => {
  if (isSystemRole(firstRole) && !isSystemRole(secondRole)) return -1
  if (!isSystemRole(firstRole) && isSystemRole(secondRole)) return 1
  return firstRole.name.localeCompare(secondRole.name)
}))

function isSystemRole(role: iSharedUserRole.UserRoleDto): boolean {
  return role.name === "administrator" || role.name === "user"
}

function openModal(): void {
  errorMessage.value = ""
  isModalOpen.value = true
}

function closeModal(): void {
  if (isSubmitting.value) return
  cancelEdit()
  errorMessage.value = ""
  isModalOpen.value = false
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

function cancelEdit(): void {
  editedRoleUid.value = null
  editedRoleName.value = ""
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
  <section class="mb-5 rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
    <div class="flex items-center justify-between gap-3 px-4 py-3">
      <div class="min-w-0">
        <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Роли</h2>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {{ props.roles.length }} в справочнике, пользовательских: {{ customRolesCount }}
        </p>
      </div>
      <button
        class="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-blue-200 px-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
        type="button"
        @click="openModal"
      >
        <ShieldIcon class="h-4 w-4" aria-hidden="true" />
        Управлять
      </button>
    </div>

    <div class="flex flex-wrap gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
      <span
        v-for="role in sortedRoles"
        :key="role.uid"
        class="inline-flex min-h-8 max-w-full items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200"
      >
        <LockIcon v-if="isSystemRole(role)" class="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
        <ShieldIcon v-else class="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-300" aria-hidden="true" />
        <span class="truncate">{{ role.name }}</span>
      </span>
    </div>

    <ModalHost
      :model-value="isModalOpen"
      labelled-by="roles-management-modal-title"
      :close-on-backdrop="!isSubmitting"
      :close-on-escape="!isSubmitting"
      @update:model-value="$event ? openModal() : closeModal()"
    >
      <template #default>
        <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div class="min-w-0">
            <h2 id="roles-management-modal-title" class="min-w-0 truncate text-base font-semibold text-slate-950 dark:text-slate-50">
              Управление ролями
            </h2>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {{ props.roles.length }} в справочнике
            </p>
          </div>
          <button
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            type="button"
            aria-label="Закрыть окно"
            :disabled="isSubmitting"
            @click="closeModal"
          >
            <XIcon class="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div class="grid gap-4 px-5 py-4">
          <div v-if="errorMessage" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">
            {{ errorMessage }}
          </div>

          <form class="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/40" @submit.prevent="createRole">
            <label class="text-xs font-medium uppercase text-slate-500 dark:text-slate-400" for="role-create-name">
              Новая роль
            </label>
            <div class="flex min-w-0 gap-2">
              <input
                id="role-create-name"
                v-model="newRoleName"
                class="h-10 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950"
                type="text"
                placeholder="Например, manager"
              >
              <button
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                :disabled="!canCreate"
                aria-label="Добавить роль"
              >
                <PlusIcon class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Используйте латинские буквы, цифры, дефис или подчеркивание.
            </p>
          </form>

          <div class="grid max-h-80 gap-2 overflow-y-auto pr-1">
            <div
              v-for="role in sortedRoles"
              :key="role.uid"
              class="flex min-w-0 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            >
              <div class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                <LockIcon v-if="isSystemRole(role)" class="h-4 w-4" aria-hidden="true" />
                <ShieldIcon v-else class="h-4 w-4" aria-hidden="true" />
              </div>

              <div class="min-w-0 flex-1">
                <input
                  v-if="editedRoleUid === role.uid"
                  v-model="editedRoleName"
                  class="h-9 w-full min-w-0 rounded-md border border-slate-300 px-2 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950"
                  type="text"
                >
                <div
                  v-else
                  class="truncate text-sm font-medium text-slate-950 dark:text-slate-50"
                >
                  {{ role.name }}
                </div>
                <div class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {{ isSystemRole(role) ? "Системная роль" : "Пользовательская роль" }}
                </div>
              </div>

              <div class="flex shrink-0 items-center gap-1">
                <button
                  v-if="editedRoleUid === role.uid"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-300 dark:hover:bg-blue-950"
                  type="button"
                  :disabled="isSubmitting"
                  :aria-label="`Сохранить роль ${role.name}`"
                  @click="saveRole(role)"
                >
                  <SaveIcon class="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  v-if="editedRoleUid === role.uid"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                  type="button"
                  :disabled="isSubmitting"
                  :aria-label="`Отменить редактирование роли ${role.name}`"
                  @click="cancelEdit"
                >
                  <XIcon class="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  v-if="editedRoleUid !== role.uid && !isSystemRole(role)"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-300 dark:hover:bg-blue-950"
                  type="button"
                  :disabled="isSubmitting"
                  :aria-label="`Редактировать роль ${role.name}`"
                  @click="startEdit(role)"
                >
                  <PencilIcon class="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  v-if="!isSystemRole(role)"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/40"
                  type="button"
                  :disabled="isSubmitting"
                  :aria-label="`Удалить роль ${role.name}`"
                  @click="deleteRole(role)"
                >
                  <Trash2Icon class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          <button
            class="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            type="button"
            :disabled="isSubmitting"
            @click="closeModal"
          >
            Закрыть
          </button>
        </footer>
      </template>
    </ModalHost>
  </section>
</template>
