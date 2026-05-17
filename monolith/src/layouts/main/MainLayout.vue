<script lang="ts" setup>
import { computed, onMounted, ref } from "vue"
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
const isAdministrator = computed(() => Boolean(store.state.authorization.user?.roles.some((role) => role.name === "administrator")))

onMounted(() => {
  webSocketClient.connect()
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
</script>

<template>
  <div class="grid min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50 md:grid-cols-[240px_minmax(0,1fr)]">
    <MainSidebar :is-administrator="isAdministrator" />

    <section class="grid min-w-0 grid-rows-[57px_minmax(0,1fr)]">
      <MainHeader :user-name="userName" @logout="openLogoutModal" />

      <main class="min-w-0">
        <router-view></router-view>
      </main>
    </section>

    <LogoutModal v-model="isLogoutModalOpen" @confirm="logout" />
  </div>
</template>
