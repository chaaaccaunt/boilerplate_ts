<script lang="ts" setup>
import { computed, onMounted, ref } from "vue"
import { PlusIcon, RefreshCwIcon, Trash2Icon, XIcon } from "@lucide/vue"
import { useApiClient } from "@/application/api"
import ModalHost from "@/application/providers/ModalHost.vue"
import { useStore } from "@/application/store"
import { ApiError } from "@/shared/api"
import UserCreateForm from "./components/UserCreateForm.vue"
import UserEditForm from "./components/UserEditForm.vue"
import RolesPanel from "./components/RolesPanel.vue"
import UsersTable from "./components/UsersTable.vue"

const apiClient = useApiClient()
const store = useStore()

const isLoading = ref(false)
const errorMessage = ref("")
const isCreateModalOpen = ref(false)
const editedUser = ref<iSharedUser.PublicUserDto | null>(null)
const deletedUser = ref<iSharedUser.PublicUserDto | null>(null)
const isDeleting = ref(false)

const users = computed(() => store.state.users.users)
const roles = computed(() => store.state.users.roles)
const permissions = computed(() => store.state.users.permissions)
const currentUser = computed(() => store.state.authorization.user)
const canReadUsers = computed(() => hasAnyPermission(["users.read", "users.update", "users.delete"]) || hasRole("superadministrator"))
const canCreateUsers = computed(() => hasPermission("users.create") || hasRole("superadministrator"))
const canUpdateUsers = computed(() => hasPermission("users.update") || hasRole("superadministrator"))
const canDeleteUsers = computed(() => hasPermission("users.delete") || hasRole("superadministrator"))
const canReadRoles = computed(() => hasAnyPermission(["roles.read", "roles.create", "roles.update", "roles.delete", "roles.permissions.manage", "users.create", "users.update"]) || hasRole("superadministrator"))
const canReadPermissions = computed(() => hasAnyPermission(["roles.read", "roles.permissions.manage"]) || hasRole("superadministrator"))
const canManageRolesPanel = computed(() => hasAnyPermission(["roles.read", "roles.create", "roles.update", "roles.delete", "roles.permissions.manage"]) || hasRole("superadministrator"))

onMounted(() => {
  loadUsers()
})

function loadUsers(): void {
  isLoading.value = true
  errorMessage.value = ""

  Promise.all([
    canReadUsers.value ? apiClient.users.list() : Promise.resolve(),
    canReadRoles.value ? apiClient.users.listRoles() : Promise.resolve(),
    canReadPermissions.value ? apiClient.users.listPermissions() : Promise.resolve()
  ])
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось загрузить пользователей"
    })
    .finally(() => {
      isLoading.value = false
    })
}

function openEditModal(user: iSharedUser.PublicUserDto): void {
  editedUser.value = user
}

function closeEditModal(): void {
  editedUser.value = null
}

function openDeleteModal(user: iSharedUser.PublicUserDto): void {
  errorMessage.value = ""
  deletedUser.value = user
}

function closeDeleteModal(): void {
  if (isDeleting.value) return
  deletedUser.value = null
}

function deleteUser(): void {
  if (!deletedUser.value || isDeleting.value) return

  isDeleting.value = true
  errorMessage.value = ""

  apiClient.users.delete({ uid: deletedUser.value.uid })
    .then(() => {
      deletedUser.value = null
    })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось удалить пользователя"
    })
    .finally(() => {
      isDeleting.value = false
    })
}

function hasPermission(permissionKey: iSharedPermission.PermissionKey): boolean {
  return Boolean(currentUser.value?.permissions.some((permission) => permission.key === permissionKey))
}

function hasAnyPermission(permissionKeys: iSharedPermission.PermissionKey[]): boolean {
  return permissionKeys.some((permissionKey) => hasPermission(permissionKey))
}

function hasRole(roleName: iSharedUserRole.UserRoleName): boolean {
  return Boolean(currentUser.value?.roles.some((role) => role.name === roleName))
}
</script>

<template>
  <section class="p-4 lg:p-6">
    <div class="mb-5 flex items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold text-slate-950 dark:text-slate-50">Пользователи</h1>
      <div class="flex items-center gap-2">
        <button
          class="inline-flex min-h-9 items-center gap-2 rounded-md border border-blue-200 px-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
          type="button"
          :disabled="isLoading"
          @click="loadUsers"
        >
          <RefreshCwIcon class="h-4 w-4" aria-hidden="true" />
          Обновить
        </button>
        <button
          v-if="canCreateUsers"
          class="inline-flex min-h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          type="button"
          @click="isCreateModalOpen = true"
        >
          <PlusIcon class="h-4 w-4" aria-hidden="true" />
          Создать
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {{ errorMessage }}
    </div>

    <RolesPanel
      v-if="canManageRolesPanel"
      :roles="roles"
      :permissions="permissions"
      :can-create-role="hasPermission('roles.create') || hasRole('superadministrator')"
      :can-update-role="hasPermission('roles.update') || hasRole('superadministrator')"
      :can-delete-role="hasPermission('roles.delete') || hasRole('superadministrator')"
      :can-manage-role-permissions="hasPermission('roles.permissions.manage') || hasRole('superadministrator')"
    />

    <UsersTable
      v-if="canReadUsers"
      :users="users"
      :can-update-users="canUpdateUsers"
      :can-delete-users="canDeleteUsers"
      @edit="openEditModal"
      @delete="openDeleteModal"
    />

    <ModalHost v-model="isCreateModalOpen" labelled-by="user-create-modal-title" panel-class="max-h-[92vh] overflow-hidden">
      <template #default="{ close }">
        <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 id="user-create-modal-title" class="min-w-0 truncate text-base font-semibold text-slate-950 dark:text-slate-50">
            Новый пользователь
          </h2>
          <button
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            type="button"
            aria-label="Закрыть окно"
            @click="close"
          >
            <XIcon class="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <UserCreateForm :roles="roles" @created="close" />
      </template>
    </ModalHost>

    <ModalHost :model-value="Boolean(editedUser)" labelled-by="user-edit-modal-title" panel-class="max-h-[92vh] overflow-hidden" @update:model-value="closeEditModal">
      <template #default="{ close }">
        <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 id="user-edit-modal-title" class="min-w-0 truncate text-base font-semibold text-slate-950 dark:text-slate-50">
            Редактировать пользователя
          </h2>
          <button
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            type="button"
            aria-label="Закрыть окно"
            @click="close"
          >
            <XIcon class="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <UserEditForm v-if="editedUser" :user="editedUser" :roles="roles" @updated="close" />
      </template>
    </ModalHost>

    <ModalHost :model-value="Boolean(deletedUser)" labelled-by="user-delete-modal-title" @update:model-value="closeDeleteModal">
      <template #default="{ close }">
        <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 id="user-delete-modal-title" class="min-w-0 truncate text-base font-semibold text-slate-950 dark:text-slate-50">
            Удалить пользователя?
          </h2>
          <button
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            type="button"
            aria-label="Закрыть окно"
            :disabled="isDeleting"
            @click="close"
          >
            <XIcon class="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div class="px-5 py-4 text-sm leading-6 text-slate-700 dark:text-slate-300">
          Пользователь <span class="font-semibold text-slate-950 dark:text-slate-50">{{ deletedUser?.fullName }}</span> будет удален из списка. Если это последний суперадминистратор, удаление будет отклонено.
        </div>

        <footer class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          <button
            class="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            type="button"
            :disabled="isDeleting"
            @click="close"
          >
            Отмена
          </button>
          <button
            class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="isDeleting"
            @click="deleteUser"
          >
            <Trash2Icon class="h-4 w-4" aria-hidden="true" />
            {{ isDeleting ? "Удаление..." : "Удалить" }}
          </button>
        </footer>
      </template>
    </ModalHost>
  </section>
</template>
