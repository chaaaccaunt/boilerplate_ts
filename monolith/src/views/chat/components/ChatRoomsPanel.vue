<script lang="ts" setup>
import { ref } from "vue"
import { PlusIcon, RefreshCwIcon } from "@lucide/vue"

defineProps<{
  rooms: iSharedChat.ChatRoomDto[]
  activeRoomUid: string | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  (event: "refresh"): void
  (event: "select", roomUid: string): void
  (event: "create", title: string): void
}>()

const newRoomTitle = ref("")

function createRoom(): void {
  const title = newRoomTitle.value.trim()
  if (!title) return

  emit("create", title)
  newRoomTitle.value = ""
}
</script>

<template>
  <aside class="min-w-0 border-b border-slate-200 bg-white md:border-b-0 md:border-r">
    <div class="border-b border-slate-200 p-4">
      <div class="mb-4 flex items-center justify-between gap-2">
        <h1 class="text-lg font-semibold text-slate-950">Чат</h1>
        <button
          class="inline-flex min-h-9 items-center gap-2 rounded-md border border-blue-200 px-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          :disabled="isLoading"
          @click="emit('refresh')"
        >
          <RefreshCwIcon class="h-4 w-4" aria-hidden="true" />
          Обновить
        </button>
      </div>

      <form class="flex gap-2" @submit.prevent="createRoom">
        <input
          v-model="newRoomTitle"
          class="h-9 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          type="text"
          placeholder="Название комнаты"
        >
        <button
          class="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          :disabled="!newRoomTitle.trim()"
        >
          <PlusIcon class="h-4 w-4" aria-hidden="true" />
          Создать
        </button>
      </form>
    </div>

    <div class="divide-y divide-slate-100">
      <button
        v-for="room in rooms"
        :key="room.uid"
        class="flex min-h-11 w-full min-w-0 items-center px-4 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
        :class="room.uid === activeRoomUid ? 'bg-blue-600 text-white hover:bg-blue-600 hover:text-white' : ''"
        type="button"
        @click="emit('select', room.uid)"
      >
        <span class="truncate">{{ room.title }}</span>
      </button>

      <div v-if="!rooms.length" class="p-4 text-sm text-slate-500">
        Комнаты не загружены
      </div>
    </div>
  </aside>
</template>
