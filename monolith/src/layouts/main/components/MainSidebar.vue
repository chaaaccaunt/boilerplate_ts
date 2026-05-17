<script lang="ts" setup>
import { ArchiveIcon, LayoutDashboardIcon, MessageCircleIcon, SettingsIcon, UsersIcon } from "@lucide/vue"

defineProps<{
  isAdministrator: boolean
}>()
</script>

<template>
  <aside class="min-w-0 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 md:border-b-0 md:border-r">
    <div class="border-b border-slate-200 px-4 py-4 dark:border-slate-700">
      <div class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Панель</div>
    </div>

    <nav class="flex gap-1 p-2 md:flex-col">
      <router-link
        class="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
        exact-active-class="bg-blue-600 text-white hover:bg-blue-600 hover:text-white"
        :to="{ name: 'home' }"
      >
        <LayoutDashboardIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Панель</span>
      </router-link>

      <router-link
        class="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
        active-class="bg-blue-600 text-white hover:bg-blue-600 hover:text-white"
        :to="{ name: 'chat' }"
      >
        <MessageCircleIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Чат</span>
      </router-link>

      <router-link
        v-if="isAdministrator"
        class="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
        active-class="bg-blue-600 text-white hover:bg-blue-600 hover:text-white"
        :to="{ name: 'users' }"
      >
        <UsersIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Пользователи</span>
      </router-link>

      <router-link
        v-if="isAdministrator"
        class="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
        active-class="bg-blue-600 text-white hover:bg-blue-600 hover:text-white"
        :to="{ name: 'admin-chat-rooms' }"
      >
        <ArchiveIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Архив чатов</span>
      </router-link>

      <router-link
        class="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
        active-class="bg-blue-600 text-white hover:bg-blue-600 hover:text-white"
        :to="{ name: 'settings' }"
      >
        <SettingsIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Настройки</span>
      </router-link>
    </nav>
  </aside>
</template>
