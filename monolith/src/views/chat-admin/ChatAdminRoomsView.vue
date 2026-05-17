<script lang="ts" setup>
import { computed, onMounted, ref } from "vue"
import { Trash2Icon } from "@lucide/vue"
import { useApiClient } from "@/application/api"
import { ApiError } from "@/shared/api"
import ChatMessagesList from "@/views/chat/components/ChatMessagesList.vue"

const apiClient = useApiClient()
const rooms = ref<iSharedChat.ChatRoomDto[]>([])
const selectedRoomUid = ref<string | null>(null)
const messages = ref<iSharedChat.ChatMessageDto[]>([])
const errorMessage = ref("")

const selectedRoom = computed(() => rooms.value.find((room) => room.uid === selectedRoomUid.value) || null)

onMounted(() => {
  loadClosedRooms()
})

function loadClosedRooms(): void {
  errorMessage.value = ""

  apiClient.chat.listClosedRooms()
    .then((result) => {
      rooms.value = result.rooms
      if (!selectedRoomUid.value && result.rooms[0]) {
        selectRoom(result.rooms[0].uid)
      }
    })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось загрузить закрытые комнаты"
    })
}

function selectRoom(roomUid: string): void {
  selectedRoomUid.value = roomUid
  messages.value = []

  apiClient.chat.listAdminMessages(roomUid)
    .then((result) => {
      messages.value = result.messages
    })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось загрузить сообщения комнаты"
    })
}

function hardDeleteRoom(): void {
  if (!selectedRoomUid.value) return
  if (!window.confirm("Удалить комнату и историю сообщений навсегда?")) return

  apiClient.chat.hardDeleteRoom(selectedRoomUid.value)
    .then(({ roomUid }) => {
      rooms.value = rooms.value.filter((room) => room.uid !== roomUid)
      messages.value = []
      selectedRoomUid.value = rooms.value[0]?.uid || null

      if (selectedRoomUid.value) {
        selectRoom(selectedRoomUid.value)
      }
    })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось удалить комнату"
    })
}

function resolveFileUrl(path: string): string {
  return apiClient.resolvePublicUrl(path as `/${string}`)
}

function getStatusLabel(status: iSharedChat.ChatRoomStatus): string {
  if (status === "archived_by_owner") return "Закрыта владельцем"
  if (status === "orphaned") return "Без участников"
  return "Активна"
}
</script>

<template>
  <section class="grid min-h-[calc(100vh-57px)] md:grid-cols-[320px_minmax(0,1fr)]">
    <aside class="min-w-0 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 md:border-b-0 md:border-r">
      <div class="border-b border-slate-200 p-4 dark:border-slate-700">
        <h1 class="text-lg font-semibold text-slate-950 dark:text-slate-50">Закрытые комнаты</h1>
      </div>

      <div class="divide-y divide-slate-100 dark:divide-slate-800">
        <button
          v-for="room in rooms"
          :key="room.uid"
          class="block min-h-14 w-full min-w-0 px-4 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
          :class="room.uid === selectedRoomUid ? 'bg-blue-600 text-white hover:bg-blue-600' : 'text-slate-700 dark:text-slate-200'"
          type="button"
          @click="selectRoom(room.uid)"
        >
          <span class="block truncate text-sm font-medium">{{ room.title }}</span>
          <span class="block truncate text-xs opacity-80">{{ getStatusLabel(room.status) }}</span>
        </button>

        <div v-if="!rooms.length" class="p-4 text-sm text-slate-500 dark:text-slate-400">
          Закрытых комнат нет
        </div>
      </div>
    </aside>

    <div class="grid min-w-0 grid-rows-[57px_minmax(0,1fr)]">
      <header class="flex min-w-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900">
        <div class="min-w-0">
          <div class="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{{ selectedRoom?.title || "Комната не выбрана" }}</div>
          <div v-if="selectedRoom" class="truncate text-xs text-slate-500 dark:text-slate-400">{{ getStatusLabel(selectedRoom.status) }}</div>
        </div>
        <button
          class="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md bg-red-600 px-3 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          :disabled="!selectedRoomUid"
          @click="hardDeleteRoom"
        >
          <Trash2Icon class="h-4 w-4" aria-hidden="true" />
          Удалить навсегда
        </button>
      </header>

      <ChatMessagesList
        :messages="messages"
        :active-room-uid="selectedRoomUid"
        :error-message="errorMessage"
        :resolve-file-url="resolveFileUrl"
      />
    </div>
  </section>
</template>

