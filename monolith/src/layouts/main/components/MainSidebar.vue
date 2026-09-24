<script lang="ts" setup>
import { ref, watch } from "vue"
import { useRoute } from "vue-router"
import { ActivityIcon, FilesIcon, LayoutDashboardIcon, MenuIcon, MessageCircleIcon, SettingsIcon, UsersIcon, XIcon } from "@lucide/vue"

defineProps<{
  canViewSystem: boolean
}>()

const route = useRoute()
const isMobileMenuOpen = ref(false)

const navigationItemClass = "inline-flex h-10 w-full min-w-10 items-center gap-2 rounded-md border px-3 text-sm font-medium shadow-sm transition focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
const inactiveNavigationItemClass = "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
const activeNavigationItemClass = "border-blue-500 bg-blue-50 text-blue-700 shadow-none hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-400 dark:bg-blue-950/70 dark:text-blue-100 dark:hover:border-blue-400 dark:hover:bg-blue-950/70 dark:hover:text-blue-100"

function getNavigationItemClass(routeNames: string[]): string[] {
  const isActive = typeof route.name === "string" && routeNames.includes(route.name)
  return [navigationItemClass, isActive ? activeNavigationItemClass : inactiveNavigationItemClass]
}

watch(() => route.fullPath, () => {
  isMobileMenuOpen.value = false
})
</script>

<template>
  <aside class="hidden min-w-0 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 md:block">
    <div class="flex h-14 items-center border-b border-slate-200 px-4 dark:border-slate-700">
      <div class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Панель</div>
    </div>

    <nav class="flex gap-2 p-2 md:flex-col">
      <router-link
        :class="getNavigationItemClass(['home'])"
        :to="{ name: 'home' }"
      >
        <LayoutDashboardIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Панель</span>
      </router-link>

      <router-link
        :class="getNavigationItemClass(['chat'])"
        :to="{ name: 'chat' }"
      >
        <MessageCircleIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Чат</span>
      </router-link>

      <router-link
        :class="getNavigationItemClass(['files', 'files-my', 'files-user', 'files-document'])"
        :to="{ name: 'files' }"
      >
        <FilesIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Файлы</span>
      </router-link>

      <router-link
        :class="getNavigationItemClass(['users'])"
        :to="{ name: 'users' }"
      >
        <UsersIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Пользователи</span>
      </router-link>

      <router-link
        v-if="canViewSystem"
        :class="getNavigationItemClass(['system', 'system-package-logs'])"
        :to="{ name: 'system' }"
      >
        <ActivityIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Система</span>
      </router-link>

      <router-link
        :class="getNavigationItemClass(['settings'])"
        :to="{ name: 'settings' }"
      >
        <SettingsIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Настройки</span>
      </router-link>
    </nav>
  </aside>

  <button
    class="fixed left-3 top-2.5 z-20 inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
    type="button"
    :aria-expanded="isMobileMenuOpen"
    aria-label="Открыть навигацию"
    @click="isMobileMenuOpen = true"
  >
    <MenuIcon class="h-5 w-5" aria-hidden="true" />
  </button>

  <button
    v-if="isMobileMenuOpen"
    class="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] md:hidden"
    type="button"
    aria-label="Закрыть навигацию"
    @click="isMobileMenuOpen = false"
  ></button>

  <aside
    v-if="isMobileMenuOpen"
    class="fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] border-r border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 md:hidden"
  >
    <div class="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-700">
      <div class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Навигация</div>
      <button
        class="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800"
        type="button"
        aria-label="Закрыть навигацию"
        @click="isMobileMenuOpen = false"
      >
        <XIcon class="h-5 w-5" aria-hidden="true" />
      </button>
    </div>

    <nav class="flex flex-col gap-2 p-2">
      <router-link :class="getNavigationItemClass(['home'])" :to="{ name: 'home' }">
        <LayoutDashboardIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Панель</span>
      </router-link>
      <router-link :class="getNavigationItemClass(['chat'])" :to="{ name: 'chat' }">
        <MessageCircleIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Чат</span>
      </router-link>
      <router-link :class="getNavigationItemClass(['files', 'files-my', 'files-user', 'files-document'])" :to="{ name: 'files' }">
        <FilesIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Файлы</span>
      </router-link>
      <router-link v-if="canManageUsers" :class="getNavigationItemClass(['users'])" :to="{ name: 'users' }">
        <UsersIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Пользователи</span>
      </router-link>
      <router-link v-if="canViewSystem" :class="getNavigationItemClass(['system', 'system-package-logs'])" :to="{ name: 'system' }">
        <ActivityIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Система</span>
      </router-link>
      <router-link :class="getNavigationItemClass(['settings'])" :to="{ name: 'settings' }">
        <SettingsIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Настройки</span>
      </router-link>
    </nav>
  </aside>
</template>
