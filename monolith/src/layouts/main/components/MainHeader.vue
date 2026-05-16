<script lang="ts" setup>
import { LogOutIcon } from "@lucide/vue"

defineProps<{
  userName: string
}>()

const emit = defineEmits<{
  (event: "logout"): void
}>()
</script>

<template>
  <header class="flex min-w-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4">
    <div class="min-w-0 truncate text-sm font-semibold text-slate-700">{{ userName }}</div>
    <button
      class="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60"
      type="button"
      @click="emit('logout')"
    >
      <LogOutIcon class="h-4 w-4" aria-hidden="true" />
      Выйти
    </button>
  </header>
</template>
