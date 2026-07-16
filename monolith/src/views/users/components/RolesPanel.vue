<script lang="ts" setup>
import { computed, reactive, ref, watch } from "vue"
import { LockIcon, PencilIcon, PlusIcon, SaveIcon, ShieldIcon, Trash2Icon, XIcon } from "@lucide/vue"
import { useApiClient } from "@/application/api"
import ModalHost from "@/application/providers/ModalHost.vue"
import { ApiError } from "@/shared/api"

const props = defineProps<{
  roles: iSharedUserRole.UserRoleDto[]
  permissions: iSharedPermission.PermissionDto[]
  canCreateRole: boolean
  canUpdateRole: boolean
  canDeleteRole: boolean
  canManageRolePermissions: boolean
}>()

const apiClient = useApiClient()

const newRoleName = ref("")
const editedRoleUid = ref<string | null>(null)
const editedRoleName = ref("")
const isSubmitting = ref(false)
const errorMessage = ref("")
const isModalOpen = ref(false)
const activeRoleUid = ref<string | null>(null)
const selectedPermissionKeys = reactive<Record<string, string[]>>({})

const canCreate = computed(() => Boolean(props.canCreateRole && newRoleName.value.trim() && !isSubmitting.value))
const customRolesCount = computed(() => props.roles.filter((role) => !isSystemRole(role)).length)
const sortedRoles = computed(() => props.roles.slice().sort((firstRole, secondRole) => {
  if (isSystemRole(firstRole) && !isSystemRole(secondRole)) return -1
  if (!isSystemRole(firstRole) && isSystemRole(secondRole)) return 1
  return firstRole.name.localeCompare(secondRole.name)
}))
const activeRole = computed(() => sortedRoles.value.find((role) => role.uid === activeRoleUid.value) || sortedRoles.value[0] || null)
const permissionGroups = computed(() => {
  const groups = new Map<string, {
    key: string
    title: string
    permissions: iSharedPermission.PermissionDto[]
  }>()

  props.permissions.forEach((permission) => {
    const groupKey = getPermissionGroupKey(permission.key)
    const group = groups.get(groupKey) || {
      key: groupKey,
      title: getPermissionGroupTitle(groupKey),
      permissions: []
    }

    group.permissions.push(permission)
    groups.set(groupKey, group)
  })

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      permissions: group.permissions.slice().sort((left, right) => left.key.localeCompare(right.key))
    }))
    .sort((left, right) => getPermissionGroupOrder(left.key) - getPermissionGroupOrder(right.key) || left.title.localeCompare(right.title))
})

function isSystemRole(role: iSharedUserRole.UserRoleDto): boolean {
  return role.name === "superadministrator"
}

function openModal(): void {
  errorMessage.value = ""
  syncSelectedPermissionKeys()
  if (!activeRoleUid.value && sortedRoles.value[0]) activeRoleUid.value = sortedRoles.value[0].uid
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
  if (isSystemRole(role) || !props.canUpdateRole) return
  activeRoleUid.value = role.uid
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
  if (isSystemRole(role) || !props.canDeleteRole || isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = ""

  apiClient.users.deleteRole({ uid: role.uid })
    .then(() => {
      if (activeRoleUid.value === role.uid) {
        activeRoleUid.value = sortedRoles.value.find((item) => item.uid !== role.uid)?.uid || null
      }
    })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось удалить роль"
    })
    .finally(() => {
      isSubmitting.value = false
    })
}

function saveRolePermissions(role: iSharedUserRole.UserRoleDto): void {
  if (isSystemRole(role) || !props.canManageRolePermissions || isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = ""

  apiClient.users.updateRolePermissions({
    uid: role.uid,
    permissionKeys: selectedPermissionKeys[role.uid] || []
  })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось обновить права роли"
    })
    .finally(() => {
      isSubmitting.value = false
    })
}

function syncSelectedPermissionKeys(): void {
  props.roles.forEach((role) => {
    selectedPermissionKeys[role.uid] = role.permissions.map((permission) => permission.key)
  })

  if (activeRoleUid.value && !props.roles.some((role) => role.uid === activeRoleUid.value)) {
    activeRoleUid.value = props.roles[0]?.uid || null
  }
}

watch(() => props.roles, syncSelectedPermissionKeys, { immediate: true, deep: true })

function getSelectedPermissionsCount(role: iSharedUserRole.UserRoleDto): number {
  return selectedPermissionKeys[role.uid]?.length || 0
}

function selectRole(role: iSharedUserRole.UserRoleDto): void {
  activeRoleUid.value = role.uid
  cancelEdit()
  errorMessage.value = ""
}

function getPermissionGroupKey(permissionKey: string): string {
  const prefix = permissionKey.split(".")[0] || "other"

  if (prefix === "roles") return "users"
  if (prefix === "logs") return "system"

  return prefix
}

function getPermissionGroupTitle(groupKey: string): string {
  const titles: Record<string, string> = {
    users: "Пользователи и роли",
    system: "Система",
    media: "СММ"
  }

  return titles[groupKey] || "Другое"
}

function getPermissionGroupOrder(groupKey: string): number {
  const order: Record<string, number> = {
    users: 10,
    media: 20,
    system: 30
  }

  return order[groupKey] || 100
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
      panel-class="max-h-[92vh] max-w-6xl overflow-hidden"
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

        <div class="grid max-h-[calc(92vh-8.5rem)] min-h-0 gap-4 overflow-y-auto px-5 py-4 lg:h-[calc(92vh-8.5rem)] lg:grid-cols-[20rem_minmax(0,1fr)] lg:overflow-hidden">
          <div class="flex min-h-0 flex-col gap-3">
            <div v-if="errorMessage" class="max-h-24 overflow-y-auto rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">
              {{ errorMessage }}
            </div>

            <form v-if="props.canCreateRole" class="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/40" @submit.prevent="createRole">
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
                Латинские буквы, цифры, дефис или подчеркивание.
              </p>
            </form>

            <div class="min-h-0 flex-1 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700">
              <button
                v-for="role in sortedRoles"
                :key="role.uid"
                class="grid w-full grid-cols-[2.25rem_minmax(0,1fr)] gap-3 border-b border-slate-200 px-3 py-3 text-left transition last:border-b-0 dark:border-slate-700"
                :class="activeRoleUid === role.uid ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-950'"
                type="button"
                @click="selectRole(role)"
              >
                <span class="inline-flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  <LockIcon v-if="isSystemRole(role)" class="h-4 w-4" aria-hidden="true" />
                  <ShieldIcon v-else class="h-4 w-4" aria-hidden="true" />
                </span>
                <span class="min-w-0">
                  <span class="block truncate text-sm font-medium text-slate-950 dark:text-slate-50">{{ role.name }}</span>
                  <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                    {{ isSystemRole(role) ? "Системная" : "Пользовательская" }} · прав: {{ getSelectedPermissionsCount(role) }}
                  </span>
                </span>
              </button>
            </div>
          </div>

          <div v-if="activeRole" class="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <div class="min-w-0">
                <input
                  v-if="editedRoleUid === activeRole.uid"
                  v-model="editedRoleName"
                  class="h-10 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950"
                  type="text"
                >
                <h3 v-else class="truncate text-base font-semibold text-slate-950 dark:text-slate-50">{{ activeRole.name }}</h3>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {{ isSystemRole(activeRole) ? "Системная роль, права задаются миграциями" : "Пользовательская роль" }} · выбрано прав: {{ getSelectedPermissionsCount(activeRole) }}
                </p>
              </div>

              <div class="flex shrink-0 items-center gap-1">
                <button
                  v-if="editedRoleUid === activeRole.uid"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-md text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-300 dark:hover:bg-blue-950"
                  type="button"
                  :disabled="isSubmitting"
                  :aria-label="`Сохранить роль ${activeRole.name}`"
                  @click="saveRole(activeRole)"
                >
                  <SaveIcon class="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  v-if="editedRoleUid === activeRole.uid"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                  type="button"
                  :disabled="isSubmitting"
                  :aria-label="`Отменить редактирование роли ${activeRole.name}`"
                  @click="cancelEdit"
                >
                  <XIcon class="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  v-if="editedRoleUid !== activeRole.uid && !isSystemRole(activeRole) && props.canUpdateRole"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-md text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-300 dark:hover:bg-blue-950"
                  type="button"
                  :disabled="isSubmitting"
                  :aria-label="`Редактировать роль ${activeRole.name}`"
                  @click="startEdit(activeRole)"
                >
                  <PencilIcon class="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  v-if="!isSystemRole(activeRole) && props.canDeleteRole"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/40"
                  type="button"
                  :disabled="isSubmitting"
                  :aria-label="`Удалить роль ${activeRole.name}`"
                  @click="deleteRole(activeRole)"
                >
                  <Trash2Icon class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div class="min-h-0 overflow-y-auto p-4">
              <div class="grid gap-4 xl:grid-cols-2">
                <section
                  v-for="group in permissionGroups"
                  :key="group.key"
                  class="rounded-md border border-slate-200 dark:border-slate-700"
                >
                  <header class="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                    <h4 class="text-sm font-semibold text-slate-950 dark:text-slate-50">{{ group.title }}</h4>
                    <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ group.permissions.length }} прав</p>
                  </header>
                  <div class="grid gap-1 p-2">
                    <label
                      v-for="permission in group.permissions"
                      :key="permission.uid"
                      class="flex min-w-0 items-start gap-2 rounded-md px-2 py-2 text-xs text-slate-600 dark:text-slate-300"
                      :class="isSystemRole(activeRole) ? 'opacity-60' : 'hover:bg-slate-50 dark:hover:bg-slate-950'"
                    >
                      <input
                        v-model="selectedPermissionKeys[activeRole.uid]"
                        class="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                        type="checkbox"
                        :value="permission.key"
                        :disabled="isSystemRole(activeRole) || !props.canManageRolePermissions || isSubmitting"
                      >
                      <span class="min-w-0">
                        <span class="block font-medium text-slate-800 dark:text-slate-100">{{ permission.title }}</span>
                        <span class="block break-all text-slate-500 dark:text-slate-400">{{ permission.key }}</span>
                        <span v-if="permission.description" class="mt-1 block text-slate-500 dark:text-slate-400">{{ permission.description }}</span>
                      </span>
                    </label>
                  </div>
                </section>
              </div>

              <div v-if="!isSystemRole(activeRole) && props.canManageRolePermissions" class="sticky bottom-0 mt-4 flex justify-end border-t border-slate-200 bg-white pt-4 dark:border-slate-700 dark:bg-slate-900">
                <button
                  class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  :disabled="isSubmitting"
                  @click="saveRolePermissions(activeRole)"
                >
                  <SaveIcon class="h-4 w-4" aria-hidden="true" />
                  Сохранить права
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
