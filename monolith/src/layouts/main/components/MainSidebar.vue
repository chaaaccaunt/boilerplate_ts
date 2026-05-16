<script lang="ts" setup>
import { HomeIcon, MessageCircleIcon, UsersIcon } from "@lucide/vue"

defineProps<{
  isAdministrator: boolean
}>()
</script>

<template>
  <aside class="min-w-0 border-b border-slate-200 bg-white md:border-b-0 md:border-r">
    <div class="border-b border-slate-200 px-4 py-4">
      <div class="text-sm font-semibold uppercase tracking-wide text-slate-500">Панель</div>
    </div>

    <nav class="flex gap-1 p-2 md:flex-col">
      <router-link
        class="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
        exact-active-class="bg-blue-600 text-white hover:bg-blue-600 hover:text-white"
        :to="{ name: 'home' }"
      >
        <HomeIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Домашняя</span>
      </router-link>

      <router-link
        class="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
        active-class="bg-blue-600 text-white hover:bg-blue-600 hover:text-white"
        :to="{ name: 'chat' }"
      >
        <MessageCircleIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Чат</span>
      </router-link>

      <router-link
        v-if="isAdministrator"
        class="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
        active-class="bg-blue-600 text-white hover:bg-blue-600 hover:text-white"
        :to="{ name: 'users' }"
      >
        <UsersIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">Пользователи</span>
      </router-link>
    </nav>
  </aside>
</template>
