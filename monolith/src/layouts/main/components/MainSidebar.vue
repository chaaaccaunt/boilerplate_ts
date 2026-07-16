<script lang="ts" setup>
import { computed } from "vue"
import { useRoute } from "vue-router"
import { ActivityIcon, FilesIcon, LayoutDashboardIcon, MegaphoneIcon, MessageCircleIcon, SettingsIcon, UsersIcon } from "@lucide/vue"

defineProps<{
  canManageUsers: boolean
  canViewSystem: boolean
}>()

const route = useRoute()

const activeNavigationItemClass = "border-blue-500 bg-blue-50 text-blue-700 shadow-none hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-400 dark:bg-blue-950/70 dark:text-blue-100 dark:hover:border-blue-400 dark:hover:bg-blue-950/70 dark:hover:text-blue-100"
const filesRouteNames = ["files", "files-my", "files-user"]
const isFilesRouteActive = computed(() => typeof route.name === "string" && filesRouteNames.includes(route.name))
</script>

<template>
  <aside class="min-w-0 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 md:border-b-0 md:border-r">
    <div class="flex h-14 items-center border-b border-slate-200 px-4 dark:border-slate-700">
      <div class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Панель</div>
    </div>

    <nav class="flex gap-2 p-2 md:flex-col">
      <router-link
        class="inline-flex h-10 min-w-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-200 md:w-full"
        exact-active-class="border-blue-500 bg-blue-50 text-blue-700 shadow-none hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-400 dark:bg-blue-950/70 dark:text-blue-100 dark:hover:border-blue-400 dark:hover:bg-blue-950/70 dark:hover:text-blue-100"
        :to="{ name: 'home' }"
      >
        <LayoutDashboardIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Панель</span>
      </router-link>

      <router-link
        class="inline-flex h-10 min-w-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-200 md:w-full"
        active-class="border-blue-500 bg-blue-50 text-blue-700 shadow-none hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-400 dark:bg-blue-950/70 dark:text-blue-100 dark:hover:border-blue-400 dark:hover:bg-blue-950/70 dark:hover:text-blue-100"
        :to="{ name: 'chat' }"
      >
        <MessageCircleIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Чат</span>
      </router-link>

      <router-link
        class="inline-flex h-10 min-w-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-200 md:w-full"
        :class="isFilesRouteActive ? activeNavigationItemClass : ''"
        :to="{ name: 'files' }"
      >
        <FilesIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Файлы</span>
      </router-link>

      <router-link
        class="inline-flex h-10 min-w-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-200 md:w-full"
        active-class="border-blue-500 bg-blue-50 text-blue-700 shadow-none hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-400 dark:bg-blue-950/70 dark:text-blue-100 dark:hover:border-blue-400 dark:hover:bg-blue-950/70 dark:hover:text-blue-100"
        :to="{ name: 'media' }"
      >
        <MegaphoneIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">СММ</span>
      </router-link>

      <router-link
        v-if="canManageUsers"
        class="inline-flex h-10 min-w-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-200 md:w-full"
        active-class="border-blue-500 bg-blue-50 text-blue-700 shadow-none hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-400 dark:bg-blue-950/70 dark:text-blue-100 dark:hover:border-blue-400 dark:hover:bg-blue-950/70 dark:hover:text-blue-100"
        :to="{ name: 'users' }"
      >
        <UsersIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Пользователи</span>
      </router-link>

      <router-link
        v-if="canViewSystem"
        class="inline-flex h-10 min-w-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-200 md:w-full"
        active-class="border-blue-500 bg-blue-50 text-blue-700 shadow-none hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-400 dark:bg-blue-950/70 dark:text-blue-100 dark:hover:border-blue-400 dark:hover:bg-blue-950/70 dark:hover:text-blue-100"
        :to="{ name: 'system' }"
      >
        <ActivityIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Система</span>
      </router-link>

      <router-link
        class="inline-flex h-10 min-w-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-200 md:w-full"
        active-class="border-blue-500 bg-blue-50 text-blue-700 shadow-none hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-400 dark:bg-blue-950/70 dark:text-blue-100 dark:hover:border-blue-400 dark:hover:bg-blue-950/70 dark:hover:text-blue-100"
        :to="{ name: 'settings' }"
      >
        <SettingsIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Настройки</span>
      </router-link>
    </nav>
  </aside>
</template>
