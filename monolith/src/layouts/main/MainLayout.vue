<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useRouter } from "vue-router"
import { useApiClient } from "@/application/api"
import { useWebSocketClient } from "@/application/realtime"
import { useStore } from "@/application/store"
import LogoutModal from "./components/LogoutModal.vue"
import MainHeader from "./components/MainHeader.vue"
import MainSidebar from "./components/MainSidebar.vue"

const router = useRouter()
const store = useStore()
const apiClient = useApiClient()
const webSocketClient = useWebSocketClient()

const isLogoutModalOpen = ref(false)
const userName = computed(() => store.state.authorization.user?.fullName || store.state.authorization.user?.login || "")
const canManageUsers = computed(() => hasAnyPermission(["users.read", "users.create", "users.update", "users.delete", "roles.read", "roles.create", "roles.update", "roles.delete", "roles.permissions.manage"]) || hasRole("superadministrator"))
const canViewSystem = computed(() => hasAnyPermission(["system.metrics.read"]) || hasRole("superadministrator"))

onMounted(() => {
  webSocketClient.connect()
})

onUnmounted(() => {
  webSocketClient.disconnect()
})

function openLogoutModal(): void {
  isLogoutModalOpen.value = true
}

function logout(): void {
  isLogoutModalOpen.value = false
  apiClient.authorization.logout()
    .then(() => {
      webSocketClient.disconnect()
      store.commit("authorization/clearUser")
      router.replace({ name: "login" })
    })
}

function hasPermission(permissionKey: iSharedPermission.PermissionKey): boolean {
  return Boolean(store.state.authorization.user?.permissions.some((permission) => permission.key === permissionKey))
}

function hasAnyPermission(permissionKeys: iSharedPermission.PermissionKey[]): boolean {
  return permissionKeys.some((permissionKey) => hasPermission(permissionKey))
}

function hasRole(roleName: iSharedUserRole.UserRoleName): boolean {
  return Boolean(store.state.authorization.user?.roles.some((role) => role.name === roleName))
}
</script>

<template>
  <div class="grid h-screen grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50 md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-1">
    <MainSidebar :can-manage-users="canManageUsers" :can-view-system="canViewSystem" />

    <section class="grid min-h-0 min-w-0 grid-rows-[3.5rem_minmax(0,1fr)]">
      <MainHeader :user-name="userName" @logout="openLogoutModal" />

      <main class="min-h-0 min-w-0 overflow-y-auto">
        <router-view></router-view>
      </main>
    </section>

    <LogoutModal v-model="isLogoutModalOpen" @confirm="logout" />
  </div>
</template>
