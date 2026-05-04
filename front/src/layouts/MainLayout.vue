<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useApiClient, useStore, useWebSocketClient } from "@/entities"

const router = useRouter()
const store = useStore()
const apiClient = useApiClient()
const webSocketClient = useWebSocketClient()

const userName = computed(() => store.state.authorization.user?.fullName || store.state.authorization.user?.login || "")
const isAdministrator = computed(() => Boolean(store.state.authorization.user?.roles.some((role) => role.name === "administrator")))

onMounted(() => {
  webSocketClient.connect()
  webSocketClient.on<iSharedUser.UserCreatedEventDto>("users:created", ({ user }) => {
    store.commit("users/addUser", user)
  })
})

onBeforeUnmount(() => {
  webSocketClient.off("users:created")
})

function logout(): void {
  webSocketClient.off("users:created")
  apiClient.authorization.logout()
    .then(() => {
      webSocketClient.disconnect()
      store.commit("authorization/clearUser")
      router.replace({ name: "login" })
    })
}
</script>

<template>
  <div class="main-layout">
    <aside class="main-layout__sidebar border-end bg-white">
      <div class="px-3 py-3 border-bottom">
        <div class="fw-semibold">Панель</div>
      </div>

      <nav class="nav flex-column p-2">
        <router-link class="nav-link rounded" exact-active-class="active" :to="{ name: 'home' }">
          Домашняя
        </router-link>
        <router-link class="nav-link rounded" active-class="active" :to="{ name: 'chat' }">
          Чат
        </router-link>
        <router-link v-if="isAdministrator" class="nav-link rounded" active-class="active" :to="{ name: 'users' }">
          Пользователи
        </router-link>
      </nav>
    </aside>

    <section class="main-layout__content">
      <header class="main-layout__header border-bottom bg-white px-3">
        <div class="text-truncate fw-semibold">{{ userName }}</div>
        <button class="btn btn-outline-danger btn-sm" type="button" @click="logout">
          Выйти
        </button>
      </header>

      <main class="main-layout__page">
        <router-view></router-view>
      </main>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.main-layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  min-height: 100vh;
  color: #212529;
  background: #f8f9fa;
}

.main-layout__sidebar {
  min-width: 0;
}

.main-layout__content {
  display: grid;
  grid-template-rows: 57px minmax(0, 1fr);
  min-width: 0;
}

.main-layout__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.main-layout__page {
  min-width: 0;
}

.nav-link {
  color: #495057;
}

.nav-link.active {
  color: #fff;
  background: #0d6efd;
}

@media (max-width: 768px) {
  .main-layout {
    grid-template-columns: 1fr;
  }

  .main-layout__sidebar {
    border-right: 0 !important;
    border-bottom: 1px solid #dee2e6;
  }

  .main-layout__content {
    grid-template-rows: 57px minmax(0, 1fr);
  }
}
</style>
