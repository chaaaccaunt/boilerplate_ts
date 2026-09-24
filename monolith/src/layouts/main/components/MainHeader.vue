<script lang="ts" setup>
import { BellIcon, LogOutIcon } from "@lucide/vue"

defineProps<{
  userName: string
  unreadNotifications: number
}>()

const emit = defineEmits<{
  (event: "logout"): void
}>()
</script>

<template>
  <header class="flex h-14 min-w-0 items-center justify-between gap-3 border-b border-slate-200 bg-white pl-14 pr-4 dark:border-slate-700 dark:bg-slate-900 md:px-4">
    <div class="min-w-0 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{{ userName }}</div>
    <div class="flex items-center gap-2">
    <router-link class="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700" :to="{ name: 'notifications' }" aria-label="Уведомления">
      <BellIcon class="h-4 w-4" />
      <span v-if="unreadNotifications" class="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] leading-4 text-white">{{ unreadNotifications > 99 ? '99+' : unreadNotifications }}</span>
    </router-link>
    <button
      class="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
      type="button"
      @click="emit('logout')"
    >
      <LogOutIcon class="h-4 w-4" aria-hidden="true" />
      Выйти
    </button>
    </div>
  </header>
</template>
